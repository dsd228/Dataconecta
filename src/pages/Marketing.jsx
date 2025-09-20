import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Users,
  Calculator,
  BarChart3,
  PlayCircle,
  Eye,
  Settings
} from '../utils/icons'
import Card from '../components/Card'
import Table from '../components/Table'
import { api } from '../data/mockData'

export default function Marketing() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roiCalculator, setRoiCalculator] = useState({
    investment: '',
    revenue: '',
    result: null
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await api.getMarketingData()
        setData(result)
      } catch (error) {
        console.error('Error loading marketing data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const calculateROI = () => {
    const investment = parseFloat(roiCalculator.investment)
    const revenue = parseFloat(roiCalculator.revenue)
    
    if (investment && revenue) {
      const roi = ((revenue - investment) / investment) * 100
      const roas = revenue / investment
      
      setRoiCalculator(prev => ({
        ...prev,
        result: { roi: roi.toFixed(2), roas: roas.toFixed(2) }
      }))
    }
  }

  if (loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"></div>
          <p className="text-white">Cargando herramientas de marketing...</p>
        </div>
      </div>
    )
  }

  const campaignColumns = [
    {
      header: 'Campaña',
      key: 'name',
      render: (value) => (
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      header: 'Estado',
      key: 'status',
      render: (value) => {
        const statusColors = {
          'active': 'bg-green-500',
          'completed': 'bg-blue-500',
          'planning': 'bg-yellow-500'
        }
        const statusLabels = {
          'active': 'Activa',
          'completed': 'Completada',
          'planning': 'Planificación'
        }
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusColors[value]}`}>
            {statusLabels[value]}
          </span>
        )
      }
    },
    {
      header: 'Presupuesto',
      key: 'budget',
      render: (value) => `$${value.toLocaleString()}`
    },
    {
      header: 'Gastado',
      key: 'spent',
      render: (value) => `$${value.toLocaleString()}`
    },
    {
      header: 'ROI',
      key: 'roi',
      render: (value) => (
        <span className={`font-semibold ${value > 150 ? 'text-green-400' : value > 100 ? 'text-yellow-400' : 'text-red-400'}`}>
          {value}%
        </span>
      )
    },
    {
      header: 'Acciones',
      key: 'id',
      render: () => (
        <div className="flex gap-2">
          <button className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white">
            <Eye className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-white/10 rounded text-gray-300 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const metrics = [
    {
      title: 'Alcance Total',
      value: data.metrics.totalReach.toLocaleString(),
      icon: Users,
      color: 'text-blue-400',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Engagement Rate',
      value: `${data.metrics.engagement}%`,
      icon: Target,
      color: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      title: 'Conversiones',
      value: data.metrics.conversions.toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-400',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      title: 'ROAS Promedio',
      value: `${data.metrics.avgROAS}x`,
      icon: DollarSign,
      color: 'text-orange-400',
      gradient: 'from-orange-500 to-red-600'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-white">
        <h1 className="text-3xl font-bold mb-2">Marketing</h1>
        <p className="text-gray-300">
          Simula campañas, calcula ROI y analiza métricas de marketing digital
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

      {/* Tools Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROI Calculator */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculadora ROI/ROAS
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Inversión ($)
              </label>
              <input
                type="number"
                value={roiCalculator.investment}
                onChange={(e) => setRoiCalculator(prev => ({ ...prev, investment: e.target.value }))}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="10000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ingresos Generados ($)
              </label>
              <input
                type="number"
                value={roiCalculator.revenue}
                onChange={(e) => setRoiCalculator(prev => ({ ...prev, revenue: e.target.value }))}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="25000"
              />
            </div>
            
            <button
              onClick={calculateROI}
              className="w-full glass-button bg-gradient-secondary text-white"
            >
              Calcular ROI/ROAS
            </button>
            
            {roiCalculator.result && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div className="text-center">
                  <p className="text-sm text-gray-300">ROI</p>
                  <p className="text-2xl font-bold text-green-400">{roiCalculator.result.roi}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-300">ROAS</p>
                  <p className="text-2xl font-bold text-blue-400">{roiCalculator.result.roas}x</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Campaign Simulator */}
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5" />
            Simulador de Campañas
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Audiencia
                </label>
                <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Seleccionar</option>
                  <option value="general">General (18-65)</option>
                  <option value="young">Jóvenes (18-35)</option>
                  <option value="adults">Adultos (36-55)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Presupuesto
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="5000"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Duración (días)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Objetivo
                </label>
                <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">Seleccionar</option>
                  <option value="awareness">Awareness</option>
                  <option value="conversion">Conversión</option>
                  <option value="traffic">Tráfico</option>
                </select>
              </div>
            </div>
            
            <button className="w-full glass-button bg-gradient-accent text-white">
              <PlayCircle className="w-4 h-4 mr-2" />
              Simular Campaña
            </button>
            
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Resultados Estimados:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-300">Alcance:</span>
                  <span className="text-white ml-2">~15,000</span>
                </div>
                <div>
                  <span className="text-gray-300">Clics:</span>
                  <span className="text-white ml-2">~450</span>
                </div>
                <div>
                  <span className="text-gray-300">CTR:</span>
                  <span className="text-white ml-2">~3.0%</span>
                </div>
                <div>
                  <span className="text-gray-300">CPC:</span>
                  <span className="text-white ml-2">~$11.11</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Analytics Mock */}
      <Card>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Métricas Analytics (Mock)
          </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-1">2.4M</div>
            <div className="text-sm text-gray-300">Impresiones</div>
            <div className="text-xs text-green-400">+12.3%</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-1">89K</div>
            <div className="text-sm text-gray-300">Clics</div>
            <div className="text-xs text-green-400">+8.7%</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">3.7%</div>
            <div className="text-sm text-gray-300">CTR</div>
            <div className="text-xs text-red-400">-0.2%</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400 mb-1">$12.45</div>
            <div className="text-sm text-gray-300">CPC</div>
            <div className="text-xs text-green-400">-5.1%</div>
          </div>
        </div>
      </Card>

      {/* Campaigns Table */}
      <Table
        title="Gestión de Campañas"
        columns={campaignColumns}
        data={data.campaigns}
      />
    </div>
  )
}