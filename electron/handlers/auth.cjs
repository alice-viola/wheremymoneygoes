const axios = require('axios');
const keytar = require('keytar');
const { BrowserWindow } = require('electron');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const SERVICE_NAME = 'WhereMyMoneyGoes';
const AUTH_TOKEN_ACCOUNT = 'AuthToken';
const USER_ID_ACCOUNT = 'UserId';

// In-memory cache
let currentUser = null;
let authToken = null;

function setupAuthHandlers(ipcMain, databaseService) {
  // Login
  ipcMain.handle('auth:login', async (event, data) => {
    try {
      const { email, password } = data;
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Call server authentication API
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      }, {
        headers: {
          'X-App-Source': 'electron'
        }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Login failed');
      }
      
      const { user, token } = response.data.data;
      
      // Store auth token in keychain
      await keytar.setPassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT, token);
      await keytar.setPassword(SERVICE_NAME, USER_ID_ACCOUNT, user.id);
      
      // Update in-memory cache
      authToken = token;
      currentUser = user;
      
      // Create or update local user record (without password)
      const localUser = await databaseService.getUserByEmail(email);
      if (localUser) {
        await databaseService.updateUser(localUser.id, {
          username: user.username,
          cached_auth_token: token,
          last_sync: new Date().toISOString()
        });
      } else {
        await databaseService.createUser({
          id: user.id,
          email: user.email,
          username: user.username
        });
        await databaseService.updateUser(user.id, {
          cached_auth_token: token,
          last_sync: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            subscription_tier: user.subscription_tier
          },
          token
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  });
  
  // Signup
  ipcMain.handle('auth:signup', async (event, data) => {
    try {
      const { email, password, username } = data;
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Call server signup API
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        email,
        password,
        username
      }, {
        headers: {
          'X-App-Source': 'electron'
        }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Signup failed');
      }
      
      const { user, token } = response.data.data;
      
      // Store auth token in keychain
      await keytar.setPassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT, token);
      await keytar.setPassword(SERVICE_NAME, USER_ID_ACCOUNT, user.id);
      
      // Update in-memory cache
      authToken = token;
      currentUser = user;
      
      // Create local user record
      await databaseService.createUser({
        id: user.id,
        email: user.email,
        username: user.username
      });
      await databaseService.updateUser(user.id, {
        cached_auth_token: token,
        last_sync: new Date().toISOString()
      });
      
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            subscription_tier: user.subscription_tier || 'free'
          },
          token
        }
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  });
  
  // Logout
  ipcMain.handle('auth:logout', async (event) => {
    try {
      // Clear keychain
      await keytar.deletePassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT);
      await keytar.deletePassword(SERVICE_NAME, USER_ID_ACCOUNT);
      
      // Clear in-memory cache
      authToken = null;
      currentUser = null;
      
      // Clear cached token in database
      if (currentUser?.id) {
        await databaseService.updateUser(currentUser.id, {
          cached_auth_token: null
        });
      }
      
      // Notify server (optional, for session cleanup)
      if (authToken) {
        try {
          await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'X-App-Source': 'electron'
            }
          });
        } catch (error) {
          // Ignore logout errors
          console.log('Server logout error (ignored):', error.message);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Verify current authentication
  ipcMain.handle('auth:verify', async (event) => {
    try {
      // Try to get token from keychain
      if (!authToken) {
        authToken = await keytar.getPassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT);
      }
      
      if (!authToken) {
        return { success: false, error: 'Not authenticated' };
      }
      
      // Verify with server
      const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-App-Source': 'electron'
        }
      });
      
      if (!response.data.success) {
        // Invalid token, clear it
        await keytar.deletePassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT);
        authToken = null;
        currentUser = null;
        
        return { success: false, error: 'Invalid token' };
      }
      
      currentUser = response.data.data.user;
      
      return {
        success: true,
        data: {
          user: currentUser,
          token: authToken
        }
      };
    } catch (error) {
      console.error('Verify error:', error);
      
      // Clear invalid token
      await keytar.deletePassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT);
      authToken = null;
      currentUser = null;
      
      return { success: false, error: error.message };
    }
  });
  
  // Get current auth token
  ipcMain.handle('auth:getToken', async (event) => {
    try {
      if (!authToken) {
        authToken = await keytar.getPassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT);
      }
      
      return { success: true, data: authToken };
    } catch (error) {
      console.error('Get token error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Set auth token (for migration/recovery)
  ipcMain.handle('auth:setToken', async (event, token) => {
    try {
      if (!token) {
        throw new Error('Token is required');
      }
      
      await keytar.setPassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT, token);
      authToken = token;
      
      return { success: true };
    } catch (error) {
      console.error('Set token error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get current user
  ipcMain.handle('auth:getUser', async (event) => {
    try {
      if (!currentUser) {
        // Try to load from local database
        const userId = await keytar.getPassword(SERVICE_NAME, USER_ID_ACCOUNT);
        if (userId) {
          currentUser = await databaseService.getUser(userId);
        }
      }
      
      if (!currentUser) {
        return { success: false, error: 'No user logged in' };
      }
      
      return { success: true, data: currentUser };
    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Update user profile
  ipcMain.handle('auth:updateUser', async (event, updates) => {
    try {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      
      // Update on server
      const response = await axios.patch(`${API_BASE_URL}/api/auth/user`, updates, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-App-Source': 'electron'
        }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Update failed');
      }
      
      const updatedUser = response.data.data.user;
      
      // Update local database
      await databaseService.updateUser(currentUser.id, {
        username: updatedUser.username
      });
      
      // Update cache
      currentUser = updatedUser;
      
      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Update user error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message 
      };
    }
  });
}

// Export helper to get current user ID for other handlers
async function getCurrentUserId() {
  if (currentUser) {
    return currentUser.id;
  }
  
  // Try to get from keychain
  const userId = await keytar.getPassword(SERVICE_NAME, USER_ID_ACCOUNT);
  return userId;
}

// Export helper to get auth token for API calls
async function getAuthToken() {
  if (authToken) {
    return authToken;
  }
  
  // Try to get from keychain
  authToken = await keytar.getPassword(SERVICE_NAME, AUTH_TOKEN_ACCOUNT);
  return authToken;
}

// Export configuration for other modules
const authConfig = {
  API_BASE_URL,
  getAuthToken,
  getCurrentUserId
};

module.exports = { 
  setupAuthHandlers, 
  getCurrentUserId,
  getAuthToken,
  authConfig
};
