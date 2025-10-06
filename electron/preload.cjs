const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations - Generic invoke method
  invoke: (channel, data) => {
    // Validate allowed channels
    const allowedChannels = [
      // Account operations
      'accounts:list',
      'accounts:get',
      'accounts:create',
      'accounts:update',
      'accounts:delete',
      'accounts:setDefault',
      
      // Transaction operations
      'transactions:list',
      'transactions:get',
      'transactions:create',
      'transactions:update',
      'transactions:delete',
      'transactions:bulkUpdate',
      'transactions:search',
      
      // Analytics operations
      'analytics:summary',
      'analytics:categories',
      'analytics:merchants',
      'analytics:trends',
      'analytics:monthly',
      'analytics:yearly',
      
      // Upload operations
      'uploads:process',
      'uploads:list',
      'uploads:get',
      'uploads:delete',
      'uploads:getProgress',
      
      // Auth operations
      'auth:login',
      'auth:signup',
      'auth:logout',
      'auth:verify',
      'auth:getToken',
      'auth:setToken',
      'auth:getUser',
      'auth:updateUser',
      
      // Assistant operations
      'assistant:chat',
      'assistant:suggestions',
      'assistant:categorize',
      'assistant:merchantInsights',
      'assistant:generateReport',
      'assistant:checkAvailability',
      'assistant:autoCategorize',
      
      // Dialog operations
      'dialog:selectFile',
      
      // App operations
      'app:getVersion',
      
      // Window operations
      'window:minimize',
      'window:maximize',
      'window:close'
    ];
    
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    } else {
      throw new Error(`Channel ${channel} is not allowed`);
    }
  },
  
  // Real-time event listeners
  on: (channel, callback) => {
    // Validate allowed event channels
    const allowedEvents = [
      'processing:progress',
      'processing:complete',
      'processing:error',
      'navigate',
      'update:available',
      'update:downloaded'
    ];
    
    if (allowedEvents.includes(channel)) {
      // Wrap the callback to strip the event object
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a function to remove the listener
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    } else {
      throw new Error(`Event channel ${channel} is not allowed`);
    }
  },
  
  // One-time event listeners
  once: (channel, callback) => {
    const allowedEvents = [
      'processing:progress',
      'processing:complete',
      'processing:error',
      'navigate',
      'update:available',
      'update:downloaded'
    ];
    
    if (allowedEvents.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    } else {
      throw new Error(`Event channel ${channel} is not allowed`);
    }
  },
  
  // Remove all listeners for a channel
  removeAllListeners: (channel) => {
    const allowedEvents = [
      'processing:progress',
      'processing:complete',
      'processing:error',
      'navigate',
      'update:available',
      'update:downloaded'
    ];
    
    if (allowedEvents.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    } else {
      throw new Error(`Event channel ${channel} is not allowed`);
    }
  },
  
  // File system operations (simplified)
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  
  // Auth token management
  getAuthToken: () => ipcRenderer.invoke('auth:getToken'),
  setAuthToken: (token) => ipcRenderer.invoke('auth:setToken', token),
  
  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Platform info
  platform: process.platform,
  
  // Environment detection
  isElectron: true,
  isDevelopment: process.env.NODE_ENV === 'development'
});

// Log that preload script is loaded
console.log('Preload script loaded successfully');
