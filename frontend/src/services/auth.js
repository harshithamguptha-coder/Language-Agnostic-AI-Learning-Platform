import api from './api'

export const signup = async (payload) => {
  const response = await api.post('/signup', payload)
  return response.data
}

export const login = async (payload) => {
  const response = await api.post('/login', payload)
  return response.data
}

export const getMe = async () => {
  const response = await api.get('/me')
  return response.data
}
