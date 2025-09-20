import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Hub from './pages/Hub'
import DataAnalysis from './pages/DataAnalysis'
import UXUITools from './pages/UXUITools'
import Marketing from './pages/Marketing'
import Login from './pages/Login'
import { useAuth } from './hooks/useAuth'

function App() {
  const { user, login, logout } = useAuth()

  if (!user) {
    return <Login onLogin={login} />
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Sidebar user={user} onLogout={logout} />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/hub" replace />} />
          <Route path="/hub" element={<Hub />} />
          <Route path="/data-analysis" element={<DataAnalysis />} />
          <Route path="/ux-ui" element={<UXUITools />} />
          <Route path="/marketing" element={<Marketing />} />
        </Routes>
      </main>
    </div>
  )
}

export default App