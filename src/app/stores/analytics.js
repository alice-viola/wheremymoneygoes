import { defineStore } from 'pinia'
import { analyticsApi } from '@/services/api/analytics'
import { useAccountsStore } from './accounts'

export const useAnalyticsStore = defineStore('analytics', {
  state: () => ({
    summary: null,
    categories: [],
    merchants: [],
    trends: [],
    monthlyData: [],
    isLoading: false,
    cache: {
      summary: { data: null, timestamp: null },
      categories: { data: null, timestamp: null },
      merchants: { data: null, timestamp: null },
      trends: { data: null, timestamp: null },
      monthly: { data: null, timestamp: null }
    },
    cacheTimeout: 5 * 60 * 1000 // 5 minutes
  }),
  
  getters: {
    topCategories: (state) => state.categories.slice(0, 5),
    topMerchants: (state) => state.merchants.slice(0, 10),
    netBalance: (state) => state.summary?.netBalance || 0,
    totalTransactions: (state) => state.summary?.totalTransactions || 0,
    
    categoryChartData: (state) => {
      if (!state.categories.length) return null
      
      return {
        labels: state.categories.map(c => c.category),
        datasets: [{
          label: 'Spending by Category',
          data: state.categories.map(c => c.totalAmount),
          backgroundColor: [
            '#3b82f6', '#22c55e', '#ef4444', '#f59e0b',
            '#06b6d4', '#a855f7', '#ec4899', '#6366f1',
            '#84cc16', '#f97316', '#14b8a6', '#8b5cf6'
          ]
        }]
      }
    },
    
    trendChartData: (state) => {
      if (!state.trends.length) return null
      
      return {
        labels: state.trends.map(t => t.period),
        datasets: [
          {
            label: 'Expenses',
            data: state.trends.map(t => t.expenses),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0
          },
          {
            label: 'Income',
            data: state.trends.map(t => t.income),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0
          }
        ]
      }
    }
  },
  
  actions: {
    isCacheValid(key) {
      const cached = this.cache[key]
      if (!cached.data || !cached.timestamp) return false
      return Date.now() - cached.timestamp < this.cacheTimeout
    },
    
    async fetchSummary(params = {}, forceRefresh = false) {
      // Add account filter from accounts store
      const accountsStore = useAccountsStore()
      const enhancedParams = {
        ...params,
        accountId: accountsStore.selectedAccountId
      }
      
      if (!forceRefresh && this.isCacheValid('summary')) {
        this.summary = this.cache.summary.data
        return this.summary
      }
      
      this.isLoading = true
      try {
        const response = await analyticsApi.getSummary(enhancedParams)
        this.summary = response.data  // response is already unwrapped by axios interceptor
        this.cache.summary = {
          data: this.summary,
          timestamp: Date.now()
        }
        return this.summary
      } catch (error) {
        console.error('Failed to fetch summary:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchCategories(params = {}, forceRefresh = false) {
      // Add account filter from accounts store
      const accountsStore = useAccountsStore()
      const enhancedParams = {
        ...params,
        accountId: accountsStore.selectedAccountId
      }
      
      if (!forceRefresh && this.isCacheValid('categories')) {
        this.categories = this.cache.categories.data
        return this.categories
      }
      
      this.isLoading = true
      try {
        const response = await analyticsApi.getCategories(enhancedParams)
        this.categories = response.data?.categories || []  // response is already unwrapped
        this.cache.categories = {
          data: this.categories,
          timestamp: Date.now()
        }
        return this.categories
      } catch (error) {
        console.error('Failed to fetch categories:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchMerchants(params = {}, forceRefresh = false) {
      // Add account filter from accounts store
      const accountsStore = useAccountsStore()
      const enhancedParams = {
        ...params,
        accountId: accountsStore.selectedAccountId
      }
      
      if (!forceRefresh && this.isCacheValid('merchants')) {
        this.merchants = this.cache.merchants.data
        return this.merchants
      }
      
      this.isLoading = true
      try {
        const response = await analyticsApi.getTopMerchants(enhancedParams)
        this.merchants = response.data || []  // response is already unwrapped
        this.cache.merchants = {
          data: this.merchants,
          timestamp: Date.now()
        }
        return this.merchants
      } catch (error) {
        console.error('Failed to fetch merchants:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchTrends(params = {}, forceRefresh = false) {
      // Add account filter from accounts store
      const accountsStore = useAccountsStore()
      const enhancedParams = {
        ...params,
        accountId: accountsStore.selectedAccountId
      }
      
      if (!forceRefresh && this.isCacheValid('trends')) {
        this.trends = this.cache.trends.data
        return this.trends
      }
      
      this.isLoading = true
      try {
        const response = await analyticsApi.getTrends(enhancedParams)
        this.trends = response.data?.trends || []  // response is already unwrapped
        this.cache.trends = {
          data: this.trends,
          timestamp: Date.now()
        }
        return this.trends
      } catch (error) {
        console.error('Failed to fetch trends:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchMonthlyBreakdown(params = {}, forceRefresh = false) {
      // Add account filter from accounts store
      const accountsStore = useAccountsStore()
      const enhancedParams = {
        ...params,
        accountId: accountsStore.selectedAccountId
      }
      
      if (!forceRefresh && this.isCacheValid('monthly')) {
        this.monthlyData = this.cache.monthly.data
        return this.monthlyData
      }
      
      this.isLoading = true
      try {
        const response = await analyticsApi.getMonthlyBreakdown(enhancedParams)
        this.monthlyData = response.data || []  // response is already unwrapped
        this.cache.monthly = {
          data: this.monthlyData,
          timestamp: Date.now()
        }
        return this.monthlyData
      } catch (error) {
        console.error('Failed to fetch monthly data:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    clearCache() {
      this.cache = {
        summary: { data: null, timestamp: null },
        categories: { data: null, timestamp: null },
        merchants: { data: null, timestamp: null },
        trends: { data: null, timestamp: null },
        monthly: { data: null, timestamp: null }
      }
      // Also clear the data to force refresh
      this.summary = null
      this.categories = []
      this.merchants = []
      this.trends = []
      this.monthlyData = []
    }
  }
})
