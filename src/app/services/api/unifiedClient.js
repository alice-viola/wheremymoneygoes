import axios from 'axios'
import { API_BASE_URL } from '@/utils/constants'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const toast = useToast()

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined

// Create axios instance for HTTP requests
const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for HTTP
httpClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    const token = authStore.token || localStorage.getItem('token') || sessionStorage.getItem('token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add source header for server to identify Electron requests
    if (isElectron) {
      config.headers['X-App-Source'] = 'electron'
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for HTTP
httpClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    handleError(error)
    return Promise.reject(error)
  }
)

// Error handler
function handleError(error) {
  const message = error.response?.data?.message || error.response?.data?.error || error.message || 'An error occurred'
  
  if (error.response?.status === 401) {
    const authStore = useAuthStore()
    authStore.logout()
    
    if (router.currentRoute.value.name !== 'login' && router.currentRoute.value.name !== 'signup') {
      router.push({
        name: 'login',
        query: { redirect: router.currentRoute.value.fullPath }
      })
      toast.error('Session expired. Please login again.')
    }
  } else if (error.response?.status === 429) {
    toast.error('Too many requests. Please slow down.')
  } else if (error.response?.status === 500) {
    toast.error('Server error. Please try again later.')
  } else if (error.response?.status !== 404) {
    toast.error(message)
  }
}

// Unified API Client
class UnifiedAPIClient {
  constructor() {
    this.isElectron = isElectron
  }
  
  // Helper to determine if request should use IPC or HTTP
  shouldUseIPC(endpoint) {
    if (!this.isElectron) return false
    
    // These endpoints always use HTTP even in Electron
    const httpOnlyEndpoints = [
      'assistant', // LLM proxy
      'auth/login',
      'auth/signup',
      'auth/logout',
      'auth/verify',
      'auth/reset-password'
    ]
    
    return !httpOnlyEndpoints.some(ep => endpoint.startsWith(ep))
  }
  
  // Generic request method
  async request(endpoint, method = 'get', data = null, options = {}) {
    try {
      // Remove leading slash if present
      endpoint = endpoint.replace(/^\//, '')
      
      if (this.shouldUseIPC(endpoint)) {
        // Use IPC for local operations
        return await this.ipcRequest(endpoint, method, data)
      } else {
        // Use HTTP for server operations
        return await this.httpRequest(endpoint, method, data, options)
      }
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }
  
  // IPC request handler
  async ipcRequest(endpoint, method, data) {
    // Convert REST endpoint to IPC channel
    const channel = this.endpointToChannel(endpoint, method)
    
    try {
      const result = await window.electronAPI.invoke(channel, data)
      
      if (!result.success) {
        throw new Error(result.error || 'IPC request failed')
      }
      
      return result
    } catch (error) {
      handleError({ message: error.message })
      throw error
    }
  }
  
  // HTTP request handler
  async httpRequest(endpoint, method, data, options) {
    const config = {
      url: `/api/${endpoint}`,
      method,
      ...options
    }
    
    if (data) {
      if (method === 'get') {
        config.params = data
      } else {
        config.data = data
      }
    }
    
    return await httpClient.request(config)
  }
  
  // Convert REST endpoint to IPC channel
  endpointToChannel(endpoint, method) {
    // Remove 'api/' prefix if present
    endpoint = endpoint.replace(/^api\//, '')
    
    // Map REST endpoints to IPC channels
    const mappings = {
      // Accounts
      'accounts': {
        get: 'accounts:list',
        post: 'accounts:create'
      },
      'accounts/:id': {
        get: 'accounts:get',
        patch: 'accounts:update',
        delete: 'accounts:delete'
      },
      'accounts/:id/default': {
        post: 'accounts:setDefault'
      },
      
      // Transactions
      'transactions': {
        get: 'transactions:list',
        post: 'transactions:create'
      },
      'transactions/:id': {
        get: 'transactions:get',
        patch: 'transactions:update',
        delete: 'transactions:delete'
      },
      'transactions/bulk': {
        patch: 'transactions:bulkUpdate'
      },
      'transactions/search': {
        get: 'transactions:search'
      },
      
      // Analytics
      'analytics/summary': {
        get: 'analytics:summary'
      },
      'analytics/categories': {
        get: 'analytics:categories'
      },
      'analytics/merchants': {
        get: 'analytics:merchants'
      },
      'analytics/trends': {
        get: 'analytics:trends'
      },
      'analytics/monthly': {
        get: 'analytics:monthly'
      },
      'analytics/yearly': {
        get: 'analytics:yearly'
      },
      
      // Uploads
      'uploads': {
        get: 'uploads:list',
        post: 'uploads:process'
      },
      'uploads/:id': {
        get: 'uploads:get',
        delete: 'uploads:delete'
      },
      'uploads/:id/progress': {
        get: 'uploads:getProgress'
      }
    }
    
    // Try exact match first
    const exactMapping = mappings[endpoint]
    if (exactMapping && exactMapping[method]) {
      return exactMapping[method]
    }
    
    // Try pattern matching for :id endpoints
    for (const [pattern, mapping] of Object.entries(mappings)) {
      if (pattern.includes(':id')) {
        const regex = new RegExp('^' + pattern.replace(':id', '([^/]+)') + '$')
        const match = endpoint.match(regex)
        if (match && mapping[method]) {
          return mapping[method]
        }
      }
    }
    
    // Default fallback
    return `${endpoint.replace(/\//g, ':')}:${method}`
  }
  
  // Convenience methods for common operations
  
  // Auth
  async login(email, password) {
    if (this.isElectron) {
      return await window.electronAPI.invoke('auth:login', { email, password })
    }
    return await this.request('auth/login', 'post', { email, password })
  }
  
  async signup(email, password, username) {
    if (this.isElectron) {
      return await window.electronAPI.invoke('auth:signup', { email, password, username })
    }
    return await this.request('auth/signup', 'post', { email, password, username })
  }
  
  async logout() {
    if (this.isElectron) {
      return await window.electronAPI.invoke('auth:logout')
    }
    return await this.request('auth/logout', 'post')
  }
  
  async verifyAuth() {
    if (this.isElectron) {
      return await window.electronAPI.invoke('auth:verify')
    }
    return await this.request('auth/verify', 'get')
  }
  
  // Accounts
  async getAccounts() {
    return await this.request('accounts', 'get')
  }
  
  async getAccount(id) {
    return await this.request(`accounts/${id}`, 'get')
  }
  
  async createAccount(data) {
    return await this.request('accounts', 'post', data)
  }
  
  async updateAccount(id, data) {
    return await this.request(`accounts/${id}`, 'patch', { id, ...data })
  }
  
  async deleteAccount(id) {
    return await this.request(`accounts/${id}`, 'delete', { id })
  }
  
  async setDefaultAccount(id) {
    return await this.request(`accounts/${id}/default`, 'post', { id })
  }
  
  // Transactions
  async getTransactions(filters = {}) {
    return await this.request('transactions', 'get', filters)
  }
  
  async getTransaction(id) {
    return await this.request(`transactions/${id}`, 'get', { id })
  }
  
  async createTransaction(data) {
    return await this.request('transactions', 'post', data)
  }
  
  async updateTransaction(id, data) {
    return await this.request(`transactions/${id}`, 'patch', { id, ...data })
  }
  
  async deleteTransaction(id) {
    return await this.request(`transactions/${id}`, 'delete', { id })
  }
  
  async bulkUpdateTransactions(ids, updates) {
    return await this.request('transactions/bulk', 'patch', { ids, updates })
  }
  
  async searchTransactions(query, filters = {}) {
    return await this.request('transactions/search', 'get', { query, ...filters })
  }
  
  // Analytics
  async getAnalyticsSummary(filters = {}) {
    return await this.request('analytics/summary', 'get', filters)
  }
  
  async getCategoryBreakdown(filters = {}) {
    return await this.request('analytics/categories', 'get', filters)
  }
  
  async getTopMerchants(filters = {}) {
    return await this.request('analytics/merchants', 'get', filters)
  }
  
  async getSpendingTrends(filters = {}) {
    return await this.request('analytics/trends', 'get', filters)
  }
  
  async getMonthlyAnalytics(year, month) {
    return await this.request('analytics/monthly', 'get', { year, month })
  }
  
  async getYearlyAnalytics(year) {
    return await this.request('analytics/yearly', 'get', { year })
  }
  
  // Uploads
  async processUpload(data) {
    if (this.isElectron && data.file) {
      // For Electron, handle file selection differently
      const filePath = await window.electronAPI.selectFile()
      if (filePath) {
        return await window.electronAPI.invoke('uploads:process', {
          filePath,
          accountId: data.accountId
        })
      }
      throw new Error('No file selected')
    }
    
    // For web, use FormData
    const formData = new FormData()
    formData.append('file', data.file)
    formData.append('accountId', data.accountId)
    
    return await this.request('uploads', 'post', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
  
  async getUploads() {
    return await this.request('uploads', 'get')
  }
  
  async getUpload(id) {
    return await this.request(`uploads/${id}`, 'get', { id })
  }
  
  async deleteUpload(id) {
    return await this.request(`uploads/${id}`, 'delete', { id })
  }
  
  async getUploadProgress(id) {
    return await this.request(`uploads/${id}/progress`, 'get', { id })
  }
  
  // Assistant (always uses HTTP)
  async sendAssistantMessage(message, context = {}) {
    return await this.request('assistant/chat', 'post', { message, context })
  }
  
  async getAssistantSuggestions(context = {}) {
    return await this.request('assistant/suggestions', 'get', context)
  }
  
  // Event listeners for Electron
  setupEventListeners() {
    if (!this.isElectron) return
    
    // Listen for processing events
    window.electronAPI.on('processing:progress', (data) => {
      // Emit event that components can listen to
      window.dispatchEvent(new CustomEvent('upload:progress', { detail: data }))
    })
    
    window.electronAPI.on('processing:complete', (data) => {
      window.dispatchEvent(new CustomEvent('upload:complete', { detail: data }))
      toast.success('Upload processed successfully')
    })
    
    window.electronAPI.on('processing:error', (data) => {
      window.dispatchEvent(new CustomEvent('upload:error', { detail: data }))
      toast.error(`Upload failed: ${data.error}`)
    })
    
    // Listen for navigation events
    window.electronAPI.on('navigate', (path) => {
      router.push(path)
    })
    
    // Listen for update events
    window.electronAPI.on('update:available', () => {
      toast.info('A new update is available and will be downloaded in the background')
    })
    
    window.electronAPI.on('update:downloaded', () => {
      toast.success('Update downloaded. Restart the app to apply the update.')
    })
  }
  
  // Cleanup event listeners
  cleanupEventListeners() {
    if (!this.isElectron) return
    
    window.electronAPI.removeAllListeners('processing:progress')
    window.electronAPI.removeAllListeners('processing:complete')
    window.electronAPI.removeAllListeners('processing:error')
    window.electronAPI.removeAllListeners('navigate')
    window.electronAPI.removeAllListeners('update:available')
    window.electronAPI.removeAllListeners('update:downloaded')
  }
}

// Create and export singleton instance
const unifiedClient = new UnifiedAPIClient()

// Setup event listeners if in Electron
if (isElectron) {
  unifiedClient.setupEventListeners()
}

export default unifiedClient
export { isElectron }
