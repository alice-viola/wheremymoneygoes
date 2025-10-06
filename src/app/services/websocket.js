import { ref } from 'vue'
import { WS_BASE_URL } from '@/utils/constants'

class WebSocketService {
  constructor() {
    this.ws = null
    this.listeners = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.isConnected = ref(false)
    this.connectionId = null
  }
  
  connect(userId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }
    
    const wsUrl = `${WS_BASE_URL}/ws?userId=${userId}`
    this.ws = new WebSocket(wsUrl)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.isConnected.value = true
      this.reconnectAttempts = 0
      this.emit('connected', { timestamp: new Date().toISOString() })
    }
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        // Emit the event with just the data portion, not the entire message
        this.emit(message.type, message.data || {})
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', { error: error.message })
    }
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.isConnected.value = false
      this.emit('disconnected', { timestamp: new Date().toISOString() })
      this.attemptReconnect(userId)
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected.value = false
    }
  }
  
  attemptReconnect(userId) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('reconnect-failed', { attempts: this.reconnectAttempts })
      return
    }
    
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      if (!this.isConnected.value) {
        this.connect(userId)
      }
    }, delay)
  }
  
  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }))
    } else {
      console.error('WebSocket is not connected')
    }
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }
  
  off(event, callback) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      if (callback) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      } else {
        this.listeners.delete(event)
      }
    }
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }
  
  ping() {
    this.send('ping', {})
  }
}

// Create singleton instance
const wsService = new WebSocketService()

export default wsService
