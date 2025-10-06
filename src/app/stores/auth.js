import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref(localStorage.getItem('token') || sessionStorage.getItem('token') || null)
  const user = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // Computed
  const isAuthenticated = computed(() => !!token.value)
  const userId = computed(() => user.value?.id || null)
  const userEmail = computed(() => user.value?.email || null)
  const username = computed(() => user.value?.username || null)

  // Actions
  const setToken = (newToken, remember = false) => {
    token.value = newToken
    if (newToken) {
      if (remember) {
        localStorage.setItem('token', newToken)
        sessionStorage.removeItem('token')
      } else {
        sessionStorage.setItem('token', newToken)
        localStorage.removeItem('token')
      }
      // Set default authorization header for axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    } else {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
    }
  }

  const setUser = (userData) => {
    user.value = userData
  }

  const login = async (email, password, remember = false) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      })
      
      const { token: newToken, user: userData } = response.data
      
      setToken(newToken, remember)
      setUser(userData)
      
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const signup = async (email, password, username = null) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        email,
        password,
        username
      })
      
      const { token: newToken, user: userData } = response.data
      
      setToken(newToken, false) // Don't remember by default on signup
      setUser(userData)
      
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Signup failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      // Optional: Call logout endpoint if you have server-side session management
      await axios.post(`${API_BASE_URL}/api/auth/logout`)
    } catch (err) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', err)
    } finally {
      setToken(null)
      setUser(null)
      error.value = null
    }
  }

  const verifyToken = async () => {
    if (!token.value) {
      return false
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
      
      if (response.data.valid) {
        setUser(response.data.user)
        // Ensure axios has the token set
        axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
        return true
      } else {
        setToken(null)
        setUser(null)
        return false
      }
    } catch (err) {
      console.error('Token verification failed:', err)
      setToken(null)
      setUser(null)
      return false
    } finally {
      isLoading.value = false
    }
  }

  const refreshUser = async () => {
    if (!token.value) {
      return null
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token.value}`
        }
      })
      
      if (response.data.valid) {
        setUser(response.data.user)
        return response.data.user
      }
      return null
    } catch (err) {
      console.error('Failed to refresh user:', err)
      return null
    }
  }

  // Initialize auth state on store creation
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
    // Verify token on app load
    verifyToken()
  }

  return {
    // State
    token,
    user,
    isLoading,
    error,
    
    // Computed
    isAuthenticated,
    userId,
    userEmail,
    username,
    
    // Actions
    login,
    signup,
    logout,
    verifyToken,
    refreshUser,
    setToken,
    setUser
  }
})
