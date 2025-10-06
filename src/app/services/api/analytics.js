import apiClient from './client'

export const analyticsApi = {
  // Get overall summary
  async getSummary(params = {}) {
    return apiClient.get('/api/analytics/summary', { params })
  },
  
  // Get category breakdown
  async getCategories(params = {}) {
    return apiClient.get('/api/analytics/categories', { params })
  },
  
  // Get top merchants
  async getTopMerchants(params = {}) {
    return apiClient.get('/api/analytics/merchants', { params })
  },
  
  // Get spending trends
  async getTrends(params = {}) {
    return apiClient.get('/api/analytics/trends', { params })
  },
  
  // Get monthly breakdown
  async getMonthlyBreakdown(params = {}) {
    return apiClient.get('/api/analytics/monthly', { params })
  }
}
