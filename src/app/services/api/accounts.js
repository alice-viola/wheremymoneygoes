import apiClient from './client'

export const accountsApi = {
  // Get all accounts for a user
  async getAccounts(includeInactive = false) {
    return apiClient.get('/api/accounts', {
      params: { includeInactive }
    })
  },
  
  // Get single account details
  async getAccount(accountId) {
    return apiClient.get(`/api/accounts/${accountId}`)
  },
  
  // Create new account
  async createAccount(accountData) {
    return apiClient.post('/api/accounts', accountData)
  },
  
  // Update account
  async updateAccount(accountId, updates) {
    return apiClient.patch(`/api/accounts/${accountId}`, updates)
  },
  
  // Delete account
  async deleteAccount(accountId, deleteTransactions = false) {
    return apiClient.delete(`/api/accounts/${accountId}`, {
      data: { deleteTransactions }
    })
  },
  
  // Set default account
  async setDefaultAccount(accountId) {
    return apiClient.post(`/api/accounts/${accountId}/set-default`)
  },
  
  // Get account summary
  async getAccountSummary(accountId, params = {}) {
    return apiClient.get(`/api/accounts/${accountId}/summary`, { params })
  }
}
