import React, { useState } from 'react'
import { Mail, Lock, BarChart3 } from '../utils/icons'

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onLogin(credentials)) {
      setError('')
    } else {
      setError('Credenciales inválidas')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">DataConecta Hub</h1>
          <p className="text-gray-300">Accede a tus herramientas integradas</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full glass-button bg-gradient-primary text-white font-medium"
          >
            Iniciar Sesión
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-white/5 rounded-xl">
          <p className="text-sm text-gray-300 text-center mb-2">Demo - Usa cualquier email y contraseña</p>
          <p className="text-xs text-gray-400 text-center">
            Ejemplo: demo@dataconecta.com / 123456
          </p>
        </div>
      </div>
    </div>
  )
}