import { defineStore } from 'pinia'
import { transactionsApi } from '@/services/api/transactions'
import { useAccountsStore } from './accounts'

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    transactions: [],
    currentTransaction: null,
    filters: {
      category: null,
      startDate: null,
      endDate: null,
      search: '',
      uploadId: null
    },
    pagination: {
      page: 1,
      limit: 1000,
      total: 0,
      hasMore: false
    },
    isLoading: false
  }),
  
  getters: {
    filteredTransactions: (state) => {
      let filtered = [...state.transactions]
      
      if (state.filters.category) {
        filtered = filtered.filter(t => t.category === state.filters.category)
      }
      
      if (state.filters.search) {
        const search = state.filters.search.toLowerCase()
        filtered = filtered.filter(t => 
          t.description?.toLowerCase().includes(search) ||
          t.merchantName?.toLowerCase().includes(search) ||
          t.category?.toLowerCase().includes(search)
        )
      }
      
      if (state.filters.startDate) {
        filtered = filtered.filter(t => new Date(t.date) >= new Date(state.filters.startDate))
      }
      
      if (state.filters.endDate) {
        filtered = filtered.filter(t => new Date(t.date) <= new Date(state.filters.endDate))
      }
      
      if (state.filters.uploadId) {
        filtered = filtered.filter(t => t.uploadId === state.filters.uploadId)
      }
      
      return filtered
    },
    
    totalSpent: (state) => {
      return state.transactions
        .filter(t => t.kind === '-')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    },
    
    totalIncome: (state) => {
      return state.transactions
        .filter(t => t.kind === '+')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    },
    
    transactionsByCategory: (state) => {
      const grouped = {}
      state.transactions.forEach(t => {
        if (!grouped[t.category]) {
          grouped[t.category] = []
        }
        grouped[t.category].push(t)
      })
      return grouped
    },
    
    recentTransactions: (state) => state.transactions.slice(0, 10)
  },
  
  actions: {
    async fetchTransactions(params = {}) {
      this.isLoading = true
      
      // Add account filter from accounts store
      const accountsStore = useAccountsStore()
      
      try {
        const response = await transactionsApi.getTransactions({
          ...params,
          accountId: accountsStore.selectedAccountId,
          limit: this.pagination.limit,
          offset: (this.pagination.page - 1) * this.pagination.limit
        })
        
        // Response is already unwrapped by axios interceptor
        // API returns { success: true, data: [...], pagination: {...} }
        this.transactions = response.data || []  // response is already unwrapped
        if (response.pagination) {
          this.pagination = {
            ...this.pagination,
            ...response.pagination
          }
        }
        
        return this.transactions
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },
    
    async fetchTransaction(transactionId) {
      try {
        const response = await transactionsApi.getTransaction(transactionId)
        // Response is already unwrapped by axios interceptor
        // API returns { success: true, data: {...} }
        this.currentTransaction = response.data || response  // response is already unwrapped
        return this.currentTransaction
      } catch (error) {
        console.error('Failed to fetch transaction:', error)
        throw error
      }
    },
    
    async updateTransaction(transactionId, data) {
      try {
        await transactionsApi.updateTransaction(transactionId, data)
        
        // Update local state
        const index = this.transactions.findIndex(t => t.id === transactionId)
        if (index !== -1) {
          this.transactions[index] = {
            ...this.transactions[index],
            ...data
          }
        }
        
        if (this.currentTransaction?.id === transactionId) {
          this.currentTransaction = {
            ...this.currentTransaction,
            ...data
          }
        }
        
        return true
      } catch (error) {
        console.error('Failed to update transaction:', error)
        throw error
      }
    },
    
    async deleteTransaction(transactionId) {
      try {
        await transactionsApi.deleteTransaction(transactionId)
        
        // Remove from local state
        this.transactions = this.transactions.filter(t => t.id !== transactionId)
        
        if (this.currentTransaction?.id === transactionId) {
          this.currentTransaction = null
        }
        
        return true
      } catch (error) {
        console.error('Failed to delete transaction:', error)
        throw error
      }
    },
    
    async exportTransactions(params = {}) {
      try {
        const response = await transactionsApi.exportTransactions(params)
        return response
      } catch (error) {
        console.error('Failed to export transactions:', error)
        throw error
      }
    },
    
    async deleteAllTransactions(userId, includeRawData = true) {
      try {
        const response = await transactionsApi.deleteAllTransactions(userId, includeRawData)
        
        // Clear local state
        this.transactions = []
        this.currentTransaction = null
        this.pagination = {
          page: 1,
          limit: 50,
          total: 0,
          hasMore: false
        }
        
        // Response is already unwrapped by axios interceptor
        return response
      } catch (error) {
        console.error('Failed to delete all transactions:', error)
        throw error
      }
    },
    
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
      this.pagination.page = 1 // Reset to first page when filters change
    },
    
    clearFilters() {
      this.filters = {
        category: null,
        startDate: null,
        endDate: null,
        search: '',
        uploadId: null
      }
      this.pagination.page = 1
    },
    
    setPage(page) {
      this.pagination.page = page
    },
    
    setPageSize(limit) {
      this.pagination.limit = limit
      this.pagination.page = 1
    }
  }
})
