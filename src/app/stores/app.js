import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    isLoading: false,
    notifications: [],
    theme: 'light',
    sidebarOpen: true,
    globalError: null
  }),
  
  getters: {
    unreadNotifications: (state) => state.notifications.filter(n => !n.read),
    hasUnreadNotifications: (state) => state.notifications.some(n => !n.read)
  },
  
  actions: {
    setLoading(loading) {
      this.isLoading = loading
    },
    
    addNotification(notification) {
      const newNotification = {
        id: Date.now().toString(),
        ...notification,
        timestamp: new Date().toISOString(),
        read: false
      }
      this.notifications.unshift(newNotification)
      
      // Keep only last 50 notifications
      if (this.notifications.length > 50) {
        this.notifications = this.notifications.slice(0, 50)
      }
    },
    
    markNotificationAsRead(id) {
      const notification = this.notifications.find(n => n.id === id)
      if (notification) {
        notification.read = true
      }
    },
    
    clearNotifications() {
      this.notifications = []
    },
    
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark')
      localStorage.setItem('theme', this.theme)
    },
    
    setTheme(newTheme) {
      this.theme = newTheme
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('theme', this.theme)
    },
    
    initTheme() {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.theme = savedTheme
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark')
        }
      } else {
        // Default to light theme
        this.theme = 'light'
        // Ensure dark class is removed
        document.documentElement.classList.remove('dark')
      }
    },
    
    setGlobalError(error) {
      this.globalError = error
    },
    
    clearGlobalError() {
      this.globalError = null
    }
  }
})
