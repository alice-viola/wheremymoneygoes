import { getCurrentUserId } from './auth.js';

export function setupTransactionHandlers(ipcMain, databaseService) {
  // List transactions with filters
  ipcMain.handle('transactions:list', async (event, filters = {}) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const transactions = await databaseService.getTransactions(userId, filters);
      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error listing transactions:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get a specific transaction
  ipcMain.handle('transactions:get', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Transaction ID is required');
      }
      
      const transaction = await databaseService.getTransaction(data.id, userId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      return { success: true, data: transaction };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Create a new transaction (manual entry)
  ipcMain.handle('transactions:create', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Validate required fields
      const requiredFields = ['account_id', 'transaction_date', 'kind', 'amount', 'currency', 'description'];
      for (const field of requiredFields) {
        if (!data[field] && data[field] !== 0) {
          throw new Error(`${field} is required`);
        }
      }
      
      // Validate kind
      if (!['+', '-'].includes(data.kind)) {
        throw new Error('Transaction kind must be "+" or "-"');
      }
      
      // Validate amount
      if (typeof data.amount !== 'number' || data.amount <= 0) {
        throw new Error('Amount must be a positive number');
      }
      
      const transaction = await databaseService.createTransaction(userId, data);
      return { success: true, data: transaction };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Update an existing transaction
  ipcMain.handle('transactions:update', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Transaction ID is required');
      }
      
      const { id, ...updates } = data;
      
      // Validate updates
      if (updates.kind && !['+', '-'].includes(updates.kind)) {
        throw new Error('Transaction kind must be "+" or "-"');
      }
      
      if (updates.amount !== undefined && (typeof updates.amount !== 'number' || updates.amount <= 0)) {
        throw new Error('Amount must be a positive number');
      }
      
      const transaction = await databaseService.updateTransaction(id, userId, updates);
      
      if (!transaction) {
        throw new Error('Transaction not found or update failed');
      }
      
      return { success: true, data: transaction };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Delete a transaction
  ipcMain.handle('transactions:delete', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.id) {
        throw new Error('Transaction ID is required');
      }
      
      const deleted = await databaseService.deleteTransaction(data.id, userId);
      
      if (!deleted) {
        throw new Error('Transaction not found or deletion failed');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Bulk update transactions
  ipcMain.handle('transactions:bulkUpdate', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
        throw new Error('Transaction IDs array is required');
      }
      
      if (!data.updates || typeof data.updates !== 'object') {
        throw new Error('Updates object is required');
      }
      
      const results = await databaseService.bulkUpdateTransactions(userId, data.ids, data.updates);
      
      return { success: true, data: results };
    } catch (error) {
      console.error('Error bulk updating transactions:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Search transactions
  ipcMain.handle('transactions:search', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const filters = {
        ...data,
        search: data.query || data.search
      };
      
      const transactions = await databaseService.getTransactions(userId, filters);
      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error searching transactions:', error);
      return { success: false, error: error.message };
    }
  });
}

