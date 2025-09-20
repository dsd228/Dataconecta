import React, { useState, useEffect } from 'react'
import { 
  Upload, 
  Database, 
  BarChart3, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from '../utils/icons'
import Card from '../components/Card'
import ChartWidget from '../components/ChartWidget'
import Table from '../components/Table'
import { api } from '../data/mockData'

export default function DataAnalysis() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await api.getDataAnalysis()
        setData(result)
      } catch (error) {
        console.error('Error loading data analysis:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const newDataset = await api.uploadDataset(file)
      setData(prev => ({
        ...prev,
        datasets: [...prev.datasets, newDataset]
      }))
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
          <p className="text-white">Cargando análisis de datos...</p>
        </div>
      </div>
    )
  }

  const statusIcons = {
    active: CheckCircle,
    processing: Clock,
    error: AlertCircle
  }

  const statusColors = {
    active: 'text-green-400',
    processing: 'text-yellow-400',
    error: 'text-red-400'
  }

  const datasetColumns = [
    {
      header: 'Dataset',
      key: 'name',
      render: (value) => (
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      header: 'Registros',
      key: 'records',
      render: (value) => value.toLocaleString()
    },
    {
      header: 'Última Actualización',
      key: 'lastUpdated'
    },
    {
      header: 'Estado',
      key: 'status',
      render: (value) => {
        const Icon = statusIcons[value]
        const colorClass = statusColors[value]
        return (
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${colorClass}`} />
            <span className={colorClass}>
              {value === 'active' ? 'Activo' : value === 'processing' ? 'Procesando' : 'Error'}
            </span>
          </div>
        )
      }
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-white">
        <h1 className="text-3xl font-bold mb-2">Análisis de Datos</h1>
        <p className="text-gray-300">
          Carga, visualiza y analiza tus datasets con herramientas avanzadas
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <div className="text-center">
          <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Cargar Nuevo Dataset</h3>
          <p className="text-gray-300 mb-4">
            Sube archivos CSV, Excel o JSON para comenzar el análisis
          </p>
          
          <label className="glass-button cursor-pointer inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {uploading ? 'Subiendo...' : 'Seleccionar Archivo'}
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          
          {uploading && (
            <div className="mt-4">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <Database className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-white mb-1">{data.datasets.length}</h3>
          <p className="text-gray-300">Datasets Totales</p>
        </Card>
        
        <Card className="text-center">
          <BarChart3 className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-white mb-1">
            {data.datasets.reduce((sum, d) => sum + d.records, 0).toLocaleString()}
          </h3>
          <p className="text-gray-300">Registros Totales</p>
        </Card>
        
        <Card className="text-center">
          <FileText className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-white mb-1">
            {data.datasets.filter(d => d.status === 'active').length}
          </h3>
          <p className="text-gray-300">Datasets Activos</p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWidget 
          title="Tendencia de Ventas"
          data={data.charts.salesTrend}
        />
        
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">Métricas Clave</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Promedio de Ventas Mensuales</span>
              <span className="text-white font-semibold">
                ${(data.charts.salesTrend.reduce((sum, item) => sum + item.sales, 0) / data.charts.salesTrend.length).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Meta vs Realizado</span>
              <span className="text-green-400 font-semibold">+15.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Crecimiento Trimestral</span>
              <span className="text-blue-400 font-semibold">+28.5%</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Datasets Table */}
      <Table
        title="Datasets Administrados"
        columns={datasetColumns}
        data={data.datasets}
      />
    </div>
  )
}