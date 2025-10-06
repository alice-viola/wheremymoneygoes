import { getCurrentUserId } from './auth.js';

export function setupAccountHandlers(ipcMain, databaseService) {
  // List all accounts for the current user
  ipcMain.handle('accounts:list', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const accounts = await databaseService.getAccounts(userId);
      return { success: true, data: accounts };
    } catch (error) {
      console.error('Error listing accounts:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get a specific account
  ipcMain.handle('accounts:get', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const account = await databaseService.getAccount(data.id, userId);
      if (!account) {
        throw new Error('Account not found');
      }
      
      return { success: true, data: account };
    } catch (error) {
      console.error('Error getting account:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Create a new account
  ipcMain.handle('accounts:create', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Validate required fields
      if (!data.account_name) {
        throw new Error('Account name is required');
      }
      
      const account = await databaseService.createAccount(userId, data);
      return { success: true, data: account };
    } catch (error) {
      console.error('Error creating account:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Update an existing account
  ipcMain.handle('accounts:update', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Account ID is required');
      }
      
      const { id, ...updates } = data;
      const account = await databaseService.updateAccount(id, userId, updates);
      
      if (!account) {
        throw new Error('Account not found or update failed');
      }
      
      return { success: true, data: account };
    } catch (error) {
      console.error('Error updating account:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Delete an account
  ipcMain.handle('accounts:delete', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Account ID is required');
      }
      
      const deleted = await databaseService.deleteAccount(data.id, userId);
      
      if (!deleted) {
        throw new Error('Account not found or deletion failed');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting account:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Set an account as default
  ipcMain.handle('accounts:setDefault', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Account ID is required');
      }
      
      const success = await databaseService.setDefaultAccount(data.id, userId);
      
      if (!success) {
        throw new Error('Failed to set default account');
      }
      
      // Return updated accounts list
      const accounts = await databaseService.getAccounts(userId);
      return { success: true, data: accounts };
    } catch (error) {
      console.error('Error setting default account:', error);
      return { success: false, error: error.message };
    }
  });
}