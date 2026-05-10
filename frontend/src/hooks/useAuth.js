import { createContext, createElement, useContext, useEffect, useState } from 'react'
import { getMe } from '../services/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('access_token')
      const storedUser = localStorage.getItem('user_profile')
      if (!token) {
        setLoading(false)
        return
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
      try {
        const profile = await getMe()
        localStorage.setItem('user_profile', JSON.stringify(profile))
        setUser(profile)
      } catch (error) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_profile')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user_profile', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_profile')
    setUser(null)
  }

  return createElement(AuthContext.Provider, { value: { user, loading, login, logout } }, children)
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
