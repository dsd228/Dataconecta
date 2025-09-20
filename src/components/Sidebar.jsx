import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  BarChart3, 
  Palette, 
  TrendingUp, 
  LogOut,
  User
} from '../utils/icons'

const navigation = [
  { name: 'Hub Central', href: '/hub', icon: Home },
  { name: 'Análisis de Datos', href: '/data-analysis', icon: BarChart3 },
  { name: 'UX/UI Tools', href: '/ux-ui', icon: Palette },
  { name: 'Marketing', href: '/marketing', icon: TrendingUp },
]

export default function Sidebar({ user, onLogout }) {
  const location = useLocation()

  return (
    <div className="w-72 glass-card m-4 p-6 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">DataConecta</h1>
          <p className="text-sm text-gray-300">Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`nav-item ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="mt-8 pt-6 border-t border-white/20">
        <div className="flex items-center gap-3 mb-4">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <p className="font-medium text-white">{user.name}</p>
            <p className="text-sm text-gray-300">{user.email}</p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )
}