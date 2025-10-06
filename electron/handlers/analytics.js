import { getCurrentUserId } from './auth.js';

export function setupAnalyticsHandlers(ipcMain, databaseService) {
  // Get analytics summary
  ipcMain.handle('analytics:summary', async (event, filters = {}) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const summary = await databaseService.getAnalyticsSummary(userId, filters);
      return { success: true, data: summary };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get category breakdown
  ipcMain.handle('analytics:categories', async (event, filters = {}) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const categories = await databaseService.getCategoryBreakdown(userId, filters);
      
      // Format data for frontend charts
      const formattedData = categories.map(cat => ({
        category: cat.category || 'Uncategorized',
        transaction_count: cat.transaction_count,
        total_spent: cat.total_spent,
        total_earned: cat.total_earned,
        net_amount: cat.total_earned - cat.total_spent,
        percentage: 0 // Will be calculated on frontend
      }));
      
      return { success: true, data: formattedData };
    } catch (error) {
      console.error('Error getting category breakdown:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get top merchants
  ipcMain.handle('analytics:merchants', async (event, filters = {}) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const merchants = await databaseService.getTopMerchants(userId, filters);
      return { success: true, data: merchants };
    } catch (error) {
      console.error('Error getting top merchants:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get spending trends
  ipcMain.handle('analytics:trends', async (event, filters = {}) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const trends = await databaseService.getSpendingTrends(userId, filters);
      
      // Format data for frontend charts
      const formattedData = trends.map(trend => ({
        month: trend.transaction_month,
        income: trend.total_earned,
        expenses: trend.total_spent,
        net: trend.total_earned - trend.total_spent,
        transaction_count: trend.transaction_count
      }));
      
      return { success: true, data: formattedData };
    } catch (error) {
      console.error('Error getting spending trends:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get monthly analytics
  ipcMain.handle('analytics:monthly', async (event, data = {}) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const { year, month } = data;
      
      if (!year || !month) {
        const now = new Date();
        data.year = year || now.getFullYear();
        data.month = month || (now.getMonth() + 1);
      }
      
      // Create date range for the month
      const startDate = `${data.year}-${String(data.month).padStart(2, '0')}-01`;
      const endDate = new Date(data.year, data.month, 0).toISOString().split('T')[0];
      
      const filters = {
        start_date: startDate,
        end_date: endDate
      };
      
      // Get all analytics for the month
      const [summary, categories, trends] = await Promise.all([
        databaseService.getAnalyticsSummary(userId, filters),
        databaseService.getCategoryBreakdown(userId, filters),
        databaseService.getSpendingTrends(userId, { ...filters, limit: 1 })
      ]);
      
      return {
        success: true,
        data: {
          month: `${data.year}-${String(data.month).padStart(2, '0')}`,
          summary,
          categories,
          daily_average: {
            income: summary.total_income / new Date(data.year, data.month, 0).getDate(),
            expenses: summary.total_expenses / new Date(data.year, data.month, 0).getDate()
          }
        }
      };
    } catch (error) {
      console.error('Error getting monthly analytics:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get yearly analytics
  ipcMain.handle('analytics:yearly', async (event, data = {}) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      const year = data.year || new Date().getFullYear();
      
      const filters = {
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`
      };
      
      // Get all analytics for the year
      const [summary, categories, monthlyTrends] = await Promise.all([
        databaseService.getAnalyticsSummary(userId, filters),
        databaseService.getCategoryBreakdown(userId, filters),
        databaseService.getSpendingTrends(userId, filters)
      ]);
      
      // Calculate quarterly data
      const quarters = [];
      for (let q = 1; q <= 4; q++) {
        const qStart = `${year}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`;
        const qEnd = `${year}-${String(q * 3).padStart(2, '0')}-31`;
        
        const qSummary = await databaseService.getAnalyticsSummary(userId, {
          start_date: qStart,
          end_date: qEnd
        });
        
        quarters.push({
          quarter: `Q${q}`,
          ...qSummary
        });
      }
      
      return {
        success: true,
        data: {
          year,
          summary,
          categories,
          monthly_trends: monthlyTrends,
          quarters,
          monthly_average: {
            income: summary.total_income / 12,
            expenses: summary.total_expenses / 12
          }
        }
      };
    } catch (error) {
      console.error('Error getting yearly analytics:', error);
      return { success: false, error: error.message };
    }
  });
}

