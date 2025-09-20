import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Database, 
  TrendingUp, 
  Palette,
  Activity,
  Users,
  DollarSign,
  Target
} from '../utils/icons'
import Card from '../components/Card'
import ChartWidget from '../components/ChartWidget'
import { api } from '../data/mockData'

export default function Hub() {
  const [hubData, setHubData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.getHubData()
        setHubData(data)
      } catch (error) {
        console.error('Error loading hub data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
          <p className="text-white">Cargando datos del hub...</p>
        </div>
      </div>
    )
  }

  const metrics = [
    {
      title: 'Proyectos Totales',
      value: hubData.summary.totalProjects,
      icon: BarChart3,
      gradient: 'from-blue-500 to-purple-600'
    },
    {
      title: 'Datasets Activos',
      value: hubData.summary.activeDatasets,
      icon: Database,
      gradient: 'from-green-500 to-teal-600'
    },
    {
      title: 'Campañas Activas',
      value: hubData.summary.campaignsRunning,
      icon: TrendingUp,
      gradient: 'from-orange-500 to-red-600'
    },
    {
      title: 'Prototipos Creados',
      value: hubData.summary.prototypesCreated,
      icon: Palette,
      gradient: 'from-pink-500 to-purple-600'
    }
  ]

  const kpis = [
    {
      title: 'ROI Total',
      value: `${hubData.summary.totalROI}%`,
      icon: DollarSign,
      change: '+12.5%'
    },
    {
      title: 'Tasa de Conversión',
      value: `${hubData.summary.avgConversionRate}%`,
      icon: Target,
      change: '+0.8%'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-white">
        <h1 className="text-3xl font-bold mb-2">Hub Central</h1>
        <p className="text-gray-300">
          Panel principal con insights de todas las áreas de trabajo
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <Card key={index} className="text-center">
              <div className={`w-12 h-12 bg-gradient-to-r ${metric.gradient} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{metric.value}</h3>
              <p className="text-gray-300">{metric.title}</p>
            </Card>
          )
        })}
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">{kpi.title}</p>
                  <p className="text-3xl font-bold text-white">{kpi.value}</p>
                  <p className="text-green-400 text-sm">{kpi.change} vs mes anterior</p>
                </div>
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hover={false}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Actividad Reciente
          </h3>
          <div className="space-y-3">
            {hubData.recentActivity.map((activity) => {
              const typeColors = {
                data: 'bg-blue-500',
                ux: 'bg-purple-500',
                marketing: 'bg-orange-500'
              }
              
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${typeColors[activity.type]} mt-2 flex-shrink-0`}></div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{activity.message}</p>
                    <p className="text-gray-400 text-xs">{activity.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card hover={false}>
          <h3 className="text-lg font-semibold text-white mb-4">Resumen por Área</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-400" />
                <span className="text-white">Análisis de Datos</span>
              </div>
              <span className="text-gray-300">{hubData.summary.activeDatasets} datasets</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-purple-400" />
                <span className="text-white">UX/UI Tools</span>
              </div>
              <span className="text-gray-300">{hubData.summary.prototypesCreated} prototipos</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                <span className="text-white">Marketing</span>
              </div>
              <span className="text-gray-300">{hubData.summary.campaignsRunning} campañas</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}