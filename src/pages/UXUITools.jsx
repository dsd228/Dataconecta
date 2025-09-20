import React, { useState, useEffect } from 'react'
import { 
  Palette, 
  Figma, 
  Layout, 
  Smartphone,
  Monitor,
  Download,
  Play,
  Plus,
  Eye
} from '../utils/icons'
import Card from '../components/Card'
import Table from '../components/Table'
import { api } from '../data/mockData'

export default function UXUITools() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPrototype, setSelectedPrototype] = useState('mobile')

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await api.getUXUIData()
        setData(result)
      } catch (error) {
        console.error('Error loading UX/UI data:', error)
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
          <p className="text-white">Cargando herramientas UX/UI...</p>
        </div>
      </div>
    )
  }

  const prototypeTemplates = [
    { id: 'mobile', name: 'App Móvil', icon: Smartphone },
    { id: 'web', name: 'Web Dashboard', icon: Monitor },
    { id: 'tablet', name: 'Tablet App', icon: Layout }
  ]

  const projectColumns = [
    {
      header: 'Proyecto',
      key: 'name',
      render: (value) => (
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-purple-400" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      header: 'Estado',
      key: 'status',
      render: (value) => {
        const statusColors = {
          'completed': 'bg-green-500',
          'in-progress': 'bg-blue-500',
          'planning': 'bg-yellow-500'
        }
        const statusLabels = {
          'completed': 'Completado',
          'in-progress': 'En Progreso',
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
      header: 'Progreso',
      key: 'progress',
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-white/20 rounded-full h-2">
            <div 
              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${value}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-300">{value}%</span>
        </div>
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
            <Play className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const uiKitColumns = [
    {
      header: 'UI Kit',
      key: 'name',
      render: (value) => (
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-blue-400" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      header: 'Componentes',
      key: 'components'
    },
    {
      header: 'Descargas',
      key: 'downloads'
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
            <Download className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-white">
        <h1 className="text-3xl font-bold mb-2">UX/UI Tools</h1>
        <p className="text-gray-300">
          Genera prototipos rápidos y gestiona tu repositorio de UI Kits
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-center cursor-pointer">
          <Plus className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Nuevo Prototipo</h3>
          <p className="text-gray-300 text-sm">Crear prototipo rápido</p>
        </Card>
        
        <Card className="text-center cursor-pointer">
          <Figma className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Figma Integration</h3>
          <p className="text-gray-300 text-sm">Sincronizar diseños</p>
        </Card>
        
        <Card className="text-center cursor-pointer">
          <Layout className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">UI Kit Library</h3>
          <p className="text-gray-300 text-sm">Explorar componentes</p>
        </Card>
        
        <Card className="text-center cursor-pointer">
          <Eye className="w-8 h-8 text-orange-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">Preview Tool</h3>
          <p className="text-gray-300 text-sm">Vista previa interactiva</p>
        </Card>
      </div>

      {/* Prototype Generator */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Generador de Prototipos</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-white mb-3">Seleccionar Plantilla</h4>
            <div className="space-y-2">
              {prototypeTemplates.map((template) => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    onClick={() => setSelectedPrototype(template.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      selectedPrototype === template.id 
                        ? 'bg-purple-500/20 border border-purple-400' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-purple-400" />
                    <span className="text-white">{template.name}</span>
                  </button>
                )
              })}
            </div>
            
            <button className="w-full mt-4 glass-button bg-gradient-secondary text-white">
              <Play className="w-4 h-4 mr-2" />
              Generar Prototipo
            </button>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-white mb-3">Vista Previa</h4>
            <div className="bg-white/5 rounded-xl p-6 h-64 flex items-center justify-center">
              <div className="text-center">
                <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400">
                  Selecciona una plantilla para ver la vista previa
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <Palette className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-white mb-1">{data.projects.length}</h3>
          <p className="text-gray-300">Proyectos Activos</p>
        </Card>
        
        <Card className="text-center">
          <Layout className="w-8 h-8 text-blue-400 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-white mb-1">{data.uiKits.length}</h3>
          <p className="text-gray-300">UI Kits Disponibles</p>
        </Card>
        
        <Card className="text-center">
          <Download className="w-8 h-8 text-green-400 mx-auto mb-3" />
          <h3 className="text-2xl font-bold text-white mb-1">
            {data.uiKits.reduce((sum, kit) => sum + kit.downloads, 0)}
          </h3>
          <p className="text-gray-300">Descargas Totales</p>
        </Card>
      </div>

      {/* Projects and UI Kits Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Table
          title="Proyectos de Diseño"
          columns={projectColumns}
          data={data.projects}
        />
        
        <Table
          title="UI Kits Repositorio"
          columns={uiKitColumns}
          data={data.uiKits}
        />
      </div>
    </div>
  )
}