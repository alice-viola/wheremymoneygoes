import AssistantProxyService from '../services/assistantProxy.js';
import { getCurrentUserId } from './auth.js';

export function setupAssistantHandlers(ipcMain, databaseService) {
  const assistantProxy = new AssistantProxyService();
  
  // Send message to assistant
  ipcMain.handle('assistant:chat', async (event, data) => {
    try {
      const { message, context } = data;
      
      if (!message) {
        throw new Error('Message is required');
      }
      
      // Enhance context with local data if needed
      const enhancedContext = await enhanceContext(context, databaseService);
      
      const result = await assistantProxy.sendMessage(message, enhancedContext);
      return result;
    } catch (error) {
      console.error('Assistant chat error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get AI suggestions
  ipcMain.handle('assistant:suggestions', async (event, data) => {
    try {
      const context = data || {};
      
      // Add recent transaction data for better suggestions
      const userId = await getCurrentUserId();
      if (userId) {
        const recentTransactions = await databaseService.getTransactions(userId, {
          limit: 10
        });
        
        context.recentTransactions = recentTransactions.map(t => ({
          amount: t.amount,
          kind: t.kind,
          category: t.category,
          merchant: t.merchant,
          date: t.transaction_date
        }));
      }
      
      const result = await assistantProxy.getSuggestions(context);
      return result;
    } catch (error) {
      console.error('Assistant suggestions error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Categorize transactions
  ipcMain.handle('assistant:categorize', async (event, data) => {
    try {
      const { transactionIds } = data;
      
      if (!transactionIds || !Array.isArray(transactionIds)) {
        throw new Error('Transaction IDs array is required');
      }
      
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Fetch transactions
      const transactions = [];
      for (const id of transactionIds) {
        const transaction = await databaseService.getTransaction(id, userId);
        if (transaction) {
          transactions.push(transaction);
        }
      }
      
      if (transactions.length === 0) {
        throw new Error('No valid transactions found');
      }
      
      // Get AI categorization
      const result = await assistantProxy.categorizeTransactions(transactions);
      
      if (result.success) {
        // Update transactions with new categories
        for (const categorized of result.data.categorized) {
          await databaseService.updateTransaction(
            categorized.id,
            userId,
            { category: categorized.category }
          );
          
          // Update merchant cache
          const transaction = transactions.find(t => t.id === categorized.id);
          if (transaction?.merchant) {
            await databaseService.setMerchantCategory(
              transaction.merchant,
              categorized.category
            );
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Assistant categorize error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get merchant insights
  ipcMain.handle('assistant:merchantInsights', async (event, data) => {
    try {
      const { merchant } = data;
      
      if (!merchant) {
        throw new Error('Merchant name is required');
      }
      
      // Check local cache first
      const cachedCategory = await databaseService.getMerchantCategory(merchant);
      
      // Get insights from AI
      const result = await assistantProxy.getMerchantInsights(merchant);
      
      if (result.success && result.data.category && !cachedCategory) {
        // Cache the category locally
        await databaseService.setMerchantCategory(merchant, result.data.category);
      }
      
      return result;
    } catch (error) {
      console.error('Merchant insights error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Generate financial report
  ipcMain.handle('assistant:generateReport', async (event, data) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { period, type } = data;
      
      // Gather data for report
      const reportData = await gatherReportData(userId, period, databaseService);
      
      const result = await assistantProxy.generateReport({
        ...data,
        data: reportData
      });
      
      return result;
    } catch (error) {
      console.error('Report generation error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Check assistant availability
  ipcMain.handle('assistant:checkAvailability', async (event) => {
    try {
      const available = await assistantProxy.checkAvailability();
      return { success: true, data: { available } };
    } catch (error) {
      console.error('Assistant availability check error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Auto-categorize new transactions
  ipcMain.handle('assistant:autoCategorize', async (event, data) => {
    try {
      const { uploadId } = data;
      const userId = await getCurrentUserId();
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Get uncategorized transactions from upload
      const transactions = await databaseService.getTransactions(userId, {
        upload_id: uploadId,
        category: null
      });
      
      if (transactions.length === 0) {
        return { success: true, data: { categorized: 0 } };
      }
      
      // Check merchant cache first
      let categorizedCount = 0;
      const uncategorized = [];
      
      for (const transaction of transactions) {
        if (transaction.merchant) {
          const cachedCategory = await databaseService.getMerchantCategory(transaction.merchant);
          if (cachedCategory) {
            await databaseService.updateTransaction(
              transaction.id,
              userId,
              { category: cachedCategory }
            );
            categorizedCount++;
          } else {
            uncategorized.push(transaction);
          }
        } else {
          uncategorized.push(transaction);
        }
      }
      
      // Use AI for remaining transactions
      if (uncategorized.length > 0) {
        const result = await assistantProxy.categorizeTransactions(uncategorized);
        
        if (result.success) {
          for (const categorized of result.data.categorized) {
            await databaseService.updateTransaction(
              categorized.id,
              userId,
              { category: categorized.category }
            );
            
            // Update merchant cache
            const transaction = uncategorized.find(t => t.id === categorized.id);
            if (transaction?.merchant) {
              await databaseService.setMerchantCategory(
                transaction.merchant,
                categorized.category
              );
            }
            
            categorizedCount++;
          }
        }
      }
      
      return {
        success: true,
        data: {
          categorized: categorizedCount,
          total: transactions.length
        }
      };
    } catch (error) {
      console.error('Auto-categorize error:', error);
      return { success: false, error: error.message };
    }
  });
}

// Helper function to enhance context with local data
async function enhanceContext(context, databaseService) {
  const enhanced = { ...context };
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) return enhanced;
    
    // Add user's categories
    const categories = await databaseService.getCategoryBreakdown(userId);
    enhanced.userCategories = categories.map(c => c.category).filter(Boolean);
    
    // Add recent merchants
    const merchants = await databaseService.getTopMerchants(userId, { limit: 20 });
    enhanced.frequentMerchants = merchants.map(m => m.merchant);
    
    // Add account information
    const accounts = await databaseService.getAccounts(userId);
    enhanced.accountCount = accounts.length;
    enhanced.defaultCurrency = accounts.find(a => a.is_default)?.currency || 'EUR';
    
  } catch (error) {
    console.error('Error enhancing context:', error);
  }
  
  return enhanced;
}

// Helper function to gather data for report generation
async function gatherReportData(userId, period, databaseService) {
  const reportData = {};
  
  try {
    // Determine date range
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        // Last 30 days
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    
    const filters = {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    };
    
    // Gather all relevant data
    const [summary, categories, trends, merchants] = await Promise.all([
      databaseService.getAnalyticsSummary(userId, filters),
      databaseService.getCategoryBreakdown(userId, filters),
      databaseService.getSpendingTrends(userId, filters),
      databaseService.getTopMerchants(userId, { ...filters, limit: 10 })
    ]);
    
    reportData.period = {
      start: filters.start_date,
      end: filters.end_date
    };
    reportData.summary = summary;
    reportData.categories = categories;
    reportData.trends = trends;
    reportData.topMerchants = merchants;
    
  } catch (error) {
    console.error('Error gathering report data:', error);
  }
  
  return reportData;
}

