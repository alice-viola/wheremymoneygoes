import apiClient from './client'

export const assistantApi = {
  // Get suggestions
  async getSuggestions() {
    return apiClient.get('/api/assistant/suggestions')
  },
  
  // Get conversation
  async getConversation(conversationId) {
    return apiClient.get(`/api/assistant/conversation/${conversationId}`)
  },
  
  // Send message
  async sendMessage(message, conversationId = null, runtime = 'gpt', model = null) {
    return apiClient.post('/api/assistant/chat', {
      message,
      conversationId,
      runtime,
      model
    })
  },
  
  // Clear conversation
  async clearConversation(conversationId) {
    return apiClient.delete(`/api/assistant/conversation/${conversationId}`)
  }
}
