import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: null,
    preferences: {
      currency: 'EUR',
      dateFormat: 'DD/MM/YYYY',
      pageSize: 50,
      defaultView: 'dashboard'
    }
  }),
  
  getters: {
    userId: (state) => {
      // Get user ID from auth store if currentUser is not set
      const authStore = useAuthStore()
      return state.currentUser?.id || authStore.user?.id || null
    },
    userName: (state) => {
      const authStore = useAuthStore()
      return state.currentUser?.name || authStore.user?.username || authStore.user?.email || null
    },
    userEmail: (state) => {
      const authStore = useAuthStore()
      return state.currentUser?.email || authStore.user?.email || null
    },
    isLoggedIn: (state) => {
      const authStore = useAuthStore()
      return !!state.currentUser || authStore.isAuthenticated
    }
  },
  
  actions: {
    setUser(user) {
      this.currentUser = user
    },
    
    updatePreferences(preferences) {
      this.preferences = { ...this.preferences, ...preferences }
      localStorage.setItem('userPreferences', JSON.stringify(this.preferences))
    },
    
    loadPreferences() {
      const saved = localStorage.getItem('userPreferences')
      if (saved) {
        try {
          this.preferences = { ...this.preferences, ...JSON.parse(saved) }
        } catch (error) {
          console.error('Failed to load preferences:', error)
        }
      }
    },
    
    logout() {
      this.currentUser = null
      localStorage.removeItem('userPreferences')
      // Future: Clear auth token
    }
  }
})
