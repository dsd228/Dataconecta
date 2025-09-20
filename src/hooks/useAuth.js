import { useState, useEffect } from 'react'

export function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check if user is already logged in (localStorage)
    const savedUser = localStorage.getItem('dataconecta_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const login = (credentials) => {
    // Mock authentication - in real app, this would call an API
    if (credentials.email && credentials.password) {
      const user = {
        id: 1,
        name: 'Usuario Demo',
        email: credentials.email,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent('Usuario Demo')}&background=667eea&color=fff`
      }
      setUser(user)
      localStorage.setItem('dataconecta_user', JSON.stringify(user))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('dataconecta_user')
  }

  return { user, login, logout }
}