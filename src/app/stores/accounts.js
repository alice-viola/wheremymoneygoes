import { defineStore } from 'pinia'
import apiClient from '@/services/api/client'

export const useAccountsStore = defineStore('accounts', {
  state: () => ({
    accounts: [],
    selectedAccountId: 'all', // 'all' or specific account UUID
    defaultAccountId: null,
    isLoading: false,
    error: null
  }),

  getters: {
    // Get the currently selected account object
    selectedAccount: (state) => {
      if (state.selectedAccountId === 'all') {
        return {
          id: 'all',
          accountName: 'All Accounts',
          icon: 'ViewColumnsIcon',
          color: '#6b7280'
        }
      }
      return state.accounts.find(a => a.id === state.selectedAccountId)
    },

    // Check if "All Accounts" is selected
    isAllAccountsSelected: (state) => state.selectedAccountId === 'all',

    // Get account by ID
    accountById: (state) => (id) => {
      return state.accounts.find(a => a.id === id)
    },

    // Get active accounts only
    activeAccounts: (state) => {
      return state.accounts.filter(a => a.isActive)
    },

    // Get the default account
    defaultAccount: (state) => {
      return state.accounts.find(a => a.isDefault)
    },

    // Check if user has any accounts
    hasAccounts: (state) => state.accounts.length > 0,

    // Get total balance across all accounts
    totalBalance: (state) => {
      return state.accounts.reduce((sum, account) => sum + (account.balance || 0), 0)
    }
  },

  actions: {
    // Fetch all accounts for a user
    async fetchAccounts() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiClient.get('/api/accounts')
        this.accounts = response.data || []
        
        // Set default account if not set
        if (!this.defaultAccountId && this.accounts.length > 0) {
          const defaultAccount = this.accounts.find(a => a.isDefault)
          if (defaultAccount) {
            this.defaultAccountId = defaultAccount.id
          }
        }
        
        // If selected account no longer exists, reset to 'all'
        if (this.selectedAccountId !== 'all' && !this.accountById(this.selectedAccountId)) {
          this.selectedAccountId = 'all'
        }
        
        return this.accounts
      } catch (error) {
        this.error = error.message
        console.error('Failed to fetch accounts:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Select an account (or 'all')
    selectAccount(accountId) {
      this.selectedAccountId = accountId
      
      // Store selection in localStorage for persistence
      localStorage.setItem('selectedAccountId', accountId)
      
      // Emit event for other components to react
      window.dispatchEvent(new CustomEvent('account-changed', { 
        detail: { accountId } 
      }))
    },

    // Create a new account
    async createAccount(accountData) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiClient.post('/api/accounts', accountData)
        
        const newAccount = response.data
        this.accounts.push(newAccount)
        
        // If this is the first account or set as default, update defaultAccountId
        if (newAccount.isDefault || this.accounts.length === 1) {
          this.defaultAccountId = newAccount.id
          // Update other accounts if this is the new default
          if (newAccount.isDefault) {
            this.accounts.forEach(a => {
              if (a.id !== newAccount.id) {
                a.isDefault = false
              }
            })
          }
        }
        
        return newAccount
      } catch (error) {
        this.error = error.message
        console.error('Failed to create account:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Update an account
    async updateAccount(accountId, updates) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await apiClient.patch(`/api/accounts/${accountId}`, updates)
        const updatedAccount = response.data
        
        // Update in local state
        const index = this.accounts.findIndex(a => a.id === accountId)
        if (index !== -1) {
          this.accounts[index] = updatedAccount
          
          // Update default if changed
          if (updatedAccount.isDefault) {
            this.defaultAccountId = updatedAccount.id
            // Update other accounts
            this.accounts.forEach(a => {
              if (a.id !== accountId) {
                a.isDefault = false
              }
            })
          }
        }
        
        return updatedAccount
      } catch (error) {
        this.error = error.message
        console.error('Failed to update account:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Delete an account
    async deleteAccount(accountId, deleteTransactions = false) {
      this.isLoading = true
      this.error = null
      
      try {
        await apiClient.delete(`/api/accounts/${accountId}`, {
          data: { deleteTransactions }
        })
        
        // Remove from local state
        this.accounts = this.accounts.filter(a => a.id !== accountId)
        
        // If deleted account was selected, switch to 'all'
        if (this.selectedAccountId === accountId) {
          this.selectAccount('all')
        }
        
        // If deleted account was default, update default
        if (this.defaultAccountId === accountId) {
          const newDefault = this.accounts.find(a => a.isDefault)
          this.defaultAccountId = newDefault ? newDefault.id : null
        }
        
        return true
      } catch (error) {
        this.error = error.message
        console.error('Failed to delete account:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Set default account
    async setDefaultAccount(userId, accountId) {
      this.isLoading = true
      this.error = null
      
      try {
        await apiClient.post(`/api/accounts/${accountId}/set-default`, { userId })
        
        // Update local state
        this.accounts.forEach(a => {
          a.isDefault = a.id === accountId
        })
        this.defaultAccountId = accountId
        
        return true
      } catch (error) {
        this.error = error.message
        console.error('Failed to set default account:', error)
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Initialize store from localStorage
    initFromStorage() {
      const savedAccountId = localStorage.getItem('selectedAccountId')
      if (savedAccountId) {
        this.selectedAccountId = savedAccountId
      }
    },

    // Clear store
    clearStore() {
      this.accounts = []
      this.selectedAccountId = 'all'
      this.defaultAccountId = null
      this.error = null
      localStorage.removeItem('selectedAccountId')
    }
  }
})
