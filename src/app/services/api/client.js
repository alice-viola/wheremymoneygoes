import axios from 'axios'
import { API_BASE_URL } from '@/utils/constants'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const toast = useToast()

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token from store - get fresh token on each request
    const authStore = useAuthStore()
    const token = authStore.token || localStorage.getItem('token') || sessionStorage.getItem('token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.message || error.response?.data?.error || error.message || 'An error occurred'
    
    // Handle specific error codes
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      const authStore = useAuthStore()
      authStore.logout()
      
      // Only redirect if not already on login/signup page
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
    } else if (error.response?.status === 404) {
      // Don't show toast for 404s, handle in components
    } else {
      toast.error(message)
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
