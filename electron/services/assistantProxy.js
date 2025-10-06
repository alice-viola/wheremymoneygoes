import axiosPkg from 'axios';
const axios = axiosPkg.default || axiosPkg;
import { getAuthToken, authConfig } from '../handlers/auth.js';

class AssistantProxyService {
  constructor() {
    this.baseURL = authConfig.API_BASE_URL;
  }
  
  /**
   * Send a message to the AI assistant
   * @param {string} message - The user's message
   * @param {object} context - Additional context (transactions, categories, etc.)
   * @returns {Promise<object>} - The assistant's response
   */
  async sendMessage(message, context = {}) {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required for assistant features');
      }
      
      const response = await axios.post(
        `${this.baseURL}/api/assistant/chat`,
        {
          message,
          context: {
            ...context,
            source: 'electron'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-App-Source': 'electron'
          },
          timeout: 60000 // 60 seconds for AI responses
        }
      );
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.error || 'Assistant request failed');
      }
    } catch (error) {
      console.error('Assistant proxy error:', error);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication expired. Please login again.');
      } else if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait a moment.');
      } else if (error.response?.status === 503) {
        throw new Error('Assistant service is temporarily unavailable.');
      }
      
      throw new Error(error.response?.data?.error || error.message || 'Failed to contact assistant');
    }
  }
  
  /**
   * Get AI-powered suggestions based on context
   * @param {object} context - Context for suggestions (recent transactions, categories, etc.)
   * @returns {Promise<object>} - Suggested actions or insights
   */
  async getSuggestions(context = {}) {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required for suggestions');
      }
      
      const response = await axios.get(
        `${this.baseURL}/api/assistant/suggestions`,
        {
          params: {
            ...context,
            source: 'electron'
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-App-Source': 'electron'
          },
          timeout: 30000
        }
      );
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.error || 'Failed to get suggestions');
      }
    } catch (error) {
      console.error('Suggestions error:', error);
      
      // Return empty suggestions on error (non-critical feature)
      return {
        success: true,
        data: {
          suggestions: [],
          insights: []
        }
      };
    }
  }
  
  /**
   * Categorize transactions using AI
   * @param {array} transactions - Array of transactions to categorize
   * @returns {Promise<object>} - Categorized transactions
   */
  async categorizeTransactions(transactions) {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required for AI categorization');
      }
      
      // Batch transactions for efficiency
      const batches = this.batchTransactions(transactions, 50);
      const results = [];
      
      for (const batch of batches) {
        const response = await axios.post(
          `${this.baseURL}/api/assistant/categorize`,
          {
            transactions: batch.map(t => ({
              id: t.id,
              description: t.description,
              merchant: t.merchant,
              amount: t.amount,
              kind: t.kind,
              date: t.transaction_date
            }))
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-App-Source': 'electron'
            },
            timeout: 45000
          }
        );
        
        if (response.data.success) {
          results.push(...response.data.data.categorized);
        }
      }
      
      return {
        success: true,
        data: {
          categorized: results
        }
      };
    } catch (error) {
      console.error('Categorization error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to categorize transactions');
    }
  }
  
  /**
   * Get merchant insights and patterns
   * @param {string} merchant - Merchant name
   * @returns {Promise<object>} - Insights about the merchant
   */
  async getMerchantInsights(merchant) {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required for merchant insights');
      }
      
      const response = await axios.get(
        `${this.baseURL}/api/assistant/merchant-insights`,
        {
          params: {
            merchant,
            source: 'electron'
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-App-Source': 'electron'
          },
          timeout: 30000
        }
      );
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.error || 'Failed to get merchant insights');
      }
    } catch (error) {
      console.error('Merchant insights error:', error);
      
      // Return basic info on error
      return {
        success: true,
        data: {
          merchant,
          category: null,
          insights: []
        }
      };
    }
  }
  
  /**
   * Generate financial report using AI
   * @param {object} parameters - Report parameters (period, type, etc.)
   * @returns {Promise<object>} - Generated report
   */
  async generateReport(parameters) {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required for report generation');
      }
      
      const response = await axios.post(
        `${this.baseURL}/api/assistant/generate-report`,
        {
          ...parameters,
          source: 'electron'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-App-Source': 'electron'
          },
          timeout: 90000 // 90 seconds for report generation
        }
      );
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        throw new Error(response.data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Report generation error:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to generate report');
    }
  }
  
  /**
   * Batch transactions for processing
   * @param {array} transactions - Array of transactions
   * @param {number} batchSize - Size of each batch
   * @returns {array} - Array of batches
   */
  batchTransactions(transactions, batchSize = 50) {
    const batches = [];
    for (let i = 0; i < transactions.length; i += batchSize) {
      batches.push(transactions.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * Check if assistant service is available
   * @returns {Promise<boolean>} - True if service is available
   */
  async checkAvailability() {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/assistant/health`,
        {
          timeout: 5000
        }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Assistant health check failed:', error.message);
      return false;
    }
  }
}

export default AssistantProxyService;
