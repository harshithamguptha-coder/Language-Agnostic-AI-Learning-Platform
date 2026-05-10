import api from './api'

export const sendChat = async (payload) => {
  const response = await api.post('/chat', payload)
  return response.data
}

export const getChatSessions = async () => {
  const response = await api.get('/chat-sessions')
  return response.data
}

export const createChatSession = async () => {
  const response = await api.post('/chat-sessions')
  return response.data
}

export const getChatSessionMessages = async (sessionId) => {
  const response = await api.get(`/chat-sessions/${sessionId}/messages`)
  return response.data
}

export const deleteChatSession = async (sessionId) => {
  const response = await api.delete(`/chat-sessions/${sessionId}`)
  return response.data
}

export const getHistory = async (userId) => {
  const response = await api.get(`/history/${userId}`)
  return response.data
}

export const uploadDocument = async (file, question, sessionId) => {
  const formData = new FormData()
  formData.append('file', file)
  if (question) {
    formData.append('question', question)
  }
  if (sessionId) {
    formData.append('session_id', sessionId)
  }
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}
