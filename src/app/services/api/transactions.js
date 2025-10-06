import apiClient from './client'

export const transactionsApi = {
  // Get transactions
  async getTransactions(params = {}) {
    return apiClient.get('/api/transactions', { params })
  },
  
  // Get single transaction
  async getTransaction(transactionId) {
    return apiClient.get(`/api/transactions/${transactionId}`)
  },
  
  // Update transaction
  async updateTransaction(transactionId, data) {
    return apiClient.patch(`/api/transactions/${transactionId}`, data)
  },
  
  // Delete transaction
  async deleteTransaction(transactionId) {
    return apiClient.delete(`/api/transactions/${transactionId}`)
  },
  
  // Export transactions
  async exportTransactions(params = {}) {
    const format = params.format || 'json'
    const response = await apiClient.get('/api/transactions/export', {
      params,
      responseType: format === 'csv' ? 'blob' : 'json'
    })
    
    if (format === 'csv') {
      // Create download link for CSV
      const url = window.URL.createObjectURL(new Blob([response]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    }
    
    return response
  },
  
  // Delete ALL transactions (cleanup)
  async deleteAllTransactions(includeRawData = true) {
    return apiClient.delete('/api/transactions/cleanup/all', {
      params: { includeRawData }
    })
  }
}
