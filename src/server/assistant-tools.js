import db from './config/database.js';

/**
 * Clean, modular tool handlers for the financial assistant
 * Each tool uses specific SQL queries without string concatenation
 */

export const searchTransactionsTool = {
    def: {
        type: "function",
        name: "search_transactions",
        description: "Search transactions by text in description or merchant name",
        parameters: {
            type: "object",
            properties: {
                searchText: {
                    type: "string",
                    description: "Text to search for in transaction descriptions or merchant names"
                }
            },
            required: ["searchText"]
        }
    },
    handler: async (input, state) => {
        try {
            const searchPattern = `%${input.searchText}%`;
            let query, params;
            
            if (state?.userId) {
                query = `
                    SELECT id, date, description, amount, currency, 
                           merchant_name, merchant_category, transaction_type
                    FROM transactions
                    WHERE user_id = $1 
                      AND (description ILIKE $2 OR merchant_name ILIKE $3)
                    ORDER BY date DESC
                    LIMIT 50
                `;
                params = [state.userId, searchPattern, searchPattern];
            } else {
                query = `
                    SELECT id, date, description, amount, currency, 
                           merchant_name, merchant_category, transaction_type
                    FROM transactions
                    WHERE (description ILIKE $1 OR merchant_name ILIKE $2)
                    ORDER BY date DESC
                    LIMIT 50
                `;
                params = [searchPattern, searchPattern];
            }
            
            const result = await db.query(query, params);
            
            return JSON.stringify({
                success: true,
                count: result.rows.length,
                searchTerm: input.searchText,
                transactions: result.rows
            });
        } catch (error) {
            console.error('search_transactions error:', error);
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    }
};

export const getMonthlyComparisonTool = {
    def: {
        type: "function",
        name: "get_monthly_comparison",
        description: "Compare spending between current month and previous month",
        parameters: {
            type: "object",
            properties: {},
            required: []
        }
    },
    handler: async (input, state) => {
        try {
            let currentQuery, previousQuery;
            let currentParams = [], previousParams = [];
            
            if (state?.userId) {
                currentQuery = `
                    SELECT 
                        SUM(amount) as total,
                        COUNT(*) as count,
                        AVG(amount) as average
                    FROM transactions
                    WHERE date >= date_trunc('month', CURRENT_DATE)
                      AND transaction_type = 'debit'
                      AND user_id = $1
                `;
                currentParams = [state.userId];
                
                previousQuery = `
                    SELECT 
                        SUM(amount) as total,
                        COUNT(*) as count,
                        AVG(amount) as average
                    FROM transactions
                    WHERE date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                      AND date < date_trunc('month', CURRENT_DATE)
                      AND transaction_type = 'debit'
                      AND user_id = $1
                `;
                previousParams = [state.userId];
            } else {
                currentQuery = `
                    SELECT 
                        SUM(amount) as total,
                        COUNT(*) as count,
                        AVG(amount) as average
                    FROM transactions
                    WHERE date >= date_trunc('month', CURRENT_DATE)
                      AND transaction_type = 'debit'
                `;
                
                previousQuery = `
                    SELECT 
                        SUM(amount) as total,
                        COUNT(*) as count,
                        AVG(amount) as average
                    FROM transactions
                    WHERE date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                      AND date < date_trunc('month', CURRENT_DATE)
                      AND transaction_type = 'debit'
                `;
            }
            
            const [currentResult, previousResult] = await Promise.all([
                db.query(currentQuery, currentParams),
                db.query(previousQuery, previousParams)
            ]);
            
            const current = currentResult.rows[0];
            const previous = previousResult.rows[0];
            
            const changePercent = previous?.total ? 
                ((current.total - previous.total) / previous.total * 100).toFixed(1) : 0;
            
            return JSON.stringify({
                success: true,
                currentMonth: current,
                previousMonth: previous,
                changePercent: parseFloat(changePercent),
                trend: changePercent > 0 ? 'increasing' : 'decreasing',
                message: `Your spending this month is ${Math.abs(changePercent)}% ${changePercent > 0 ? 'higher' : 'lower'} than last month.`
            });
        } catch (error) {
            console.error('get_monthly_comparison error:', error);
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    }
};

export const getUnusualTransactionsTool = {
    def: {
        type: "function",
        name: "get_unusual_transactions",
        description: "Find unusually high transactions based on spending patterns",
        parameters: {
            type: "object",
            properties: {
                daysBack: {
                    type: "number",
                    description: "Number of days to look back (default 30)"
                }
            },
            required: []
        }
    },
    handler: async (input, state) => {
        try {
            const daysBack = input.daysBack || 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysBack);
            const startDateStr = startDate.toISOString().split('T')[0];
            
            let query, params;
            
            if (state?.userId) {
                // First get the threshold for this user
                const thresholdQuery = `
                    SELECT AVG(amount) + 2 * STDDEV(amount) as threshold
                    FROM transactions
                    WHERE transaction_type = 'debit'
                      AND user_id = $1
                      AND date >= $2
                `;
                const thresholdResult = await db.query(thresholdQuery, [state.userId, startDateStr]);
                const threshold = thresholdResult.rows[0]?.threshold || 0;
                
                // Then get unusual transactions
                query = `
                    SELECT date, description, amount, merchant_name, merchant_category
                    FROM transactions
                    WHERE date >= $1
                      AND transaction_type = 'debit'
                      AND user_id = $2
                      AND amount > $3
                    ORDER BY amount DESC
                    LIMIT 10
                `;
                params = [startDateStr, state.userId, threshold];
            } else {
                // Get global threshold
                const thresholdQuery = `
                    SELECT AVG(amount) + 2 * STDDEV(amount) as threshold
                    FROM transactions
                    WHERE transaction_type = 'debit'
                      AND date >= $1
                `;
                const thresholdResult = await db.query(thresholdQuery, [startDateStr]);
                const threshold = thresholdResult.rows[0]?.threshold || 0;
                
                query = `
                    SELECT date, description, amount, merchant_name, merchant_category
                    FROM transactions
                    WHERE date >= $1
                      AND transaction_type = 'debit'
                      AND amount > $2
                    ORDER BY amount DESC
                    LIMIT 10
                `;
                params = [startDateStr, threshold];
            }
            
            const result = await db.query(query, params);
            
            return JSON.stringify({
                success: true,
                unusualTransactions: result.rows,
                period: { start: startDateStr, daysBack },
                message: result.rows.length > 0 ? 
                    `Found ${result.rows.length} unusually high transactions in the last ${daysBack} days.` :
                    'No unusual spending patterns detected.'
            });
        } catch (error) {
            console.error('get_unusual_transactions error:', error);
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    }
};

export const getRecurringExpensesTool = {
    def: {
        type: "function",
        name: "get_recurring_expenses",
        description: "Identify recurring expenses and subscriptions",
        parameters: {
            type: "object",
            properties: {
                minFrequency: {
                    type: "number",
                    description: "Minimum number of occurrences to consider recurring (default 3)"
                }
            },
            required: []
        }
    },
    handler: async (input, state) => {
        try {
            const minFrequency = input.minFrequency || 3;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startDate = thirtyDaysAgo.toISOString().split('T')[0];
            
            let query, params;
            
            if (state?.userId) {
                query = `
                    SELECT 
                        merchant_name,
                        merchant_category,
                        COUNT(*) as frequency,
                        SUM(amount) as total_spent,
                        AVG(amount) as avg_amount,
                        MIN(amount) as min_amount,
                        MAX(amount) as max_amount
                    FROM transactions
                    WHERE date >= $1
                      AND transaction_type = 'debit'
                      AND merchant_name IS NOT NULL
                      AND user_id = $2
                    GROUP BY merchant_name, merchant_category
                    HAVING COUNT(*) >= $3
                    ORDER BY frequency DESC, total_spent DESC
                    LIMIT 20
                `;
                params = [startDate, state.userId, minFrequency];
            } else {
                query = `
                    SELECT 
                        merchant_name,
                        merchant_category,
                        COUNT(*) as frequency,
                        SUM(amount) as total_spent,
                        AVG(amount) as avg_amount,
                        MIN(amount) as min_amount,
                        MAX(amount) as max_amount
                    FROM transactions
                    WHERE date >= $1
                      AND transaction_type = 'debit'
                      AND merchant_name IS NOT NULL
                    GROUP BY merchant_name, merchant_category
                    HAVING COUNT(*) >= $2
                    ORDER BY frequency DESC, total_spent DESC
                    LIMIT 20
                `;
                params = [startDate, minFrequency];
            }
            
            const result = await db.query(query, params);
            
            // Identify likely subscriptions (consistent amounts)
            const subscriptions = result.rows.filter(expense => {
                const variance = expense.max_amount - expense.min_amount;
                return variance < (expense.avg_amount * 0.1); // Less than 10% variance
            });
            
            return JSON.stringify({
                success: true,
                recurringExpenses: result.rows,
                likelySubscriptions: subscriptions,
                message: `Found ${result.rows.length} recurring expenses, ${subscriptions.length} appear to be subscriptions.`
            });
        } catch (error) {
            console.error('get_recurring_expenses error:', error);
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    }
};

export const getCategoryTrendsTool = {
    def: {
        type: "function",
        name: "get_category_trends",
        description: "Analyze spending trends by category over time",
        parameters: {
            type: "object",
            properties: {
                months: {
                    type: "number",
                    description: "Number of months to analyze (default 3)"
                }
            },
            required: []
        }
    },
    handler: async (input, state) => {
        try {
            const months = input.months || 3;
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            const startDateStr = startDate.toISOString().split('T')[0];
            
            let query, params;
            
            if (state?.userId) {
                query = `
                    SELECT 
                        DATE_TRUNC('month', date) as month,
                        merchant_category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE date >= $1
                      AND transaction_type = 'debit'
                      AND user_id = $2
                      AND merchant_category IS NOT NULL
                    GROUP BY DATE_TRUNC('month', date), merchant_category
                    ORDER BY month DESC, total_amount DESC
                `;
                params = [startDateStr, state.userId];
            } else {
                query = `
                    SELECT 
                        DATE_TRUNC('month', date) as month,
                        merchant_category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE date >= $1
                      AND transaction_type = 'debit'
                      AND merchant_category IS NOT NULL
                    GROUP BY DATE_TRUNC('month', date), merchant_category
                    ORDER BY month DESC, total_amount DESC
                `;
                params = [startDateStr];
            }
            
            const result = await db.query(query, params);
            
            // Group by category to see trends
            const categoryTrends = {};
            result.rows.forEach(row => {
                if (!categoryTrends[row.merchant_category]) {
                    categoryTrends[row.merchant_category] = [];
                }
                categoryTrends[row.merchant_category].push({
                    month: row.month,
                    amount: row.total_amount,
                    count: row.transaction_count
                });
            });
            
            return JSON.stringify({
                success: true,
                trends: result.rows,
                categoryTrends: categoryTrends,
                period: { start: startDateStr, months },
                message: `Analyzed spending trends across ${Object.keys(categoryTrends).length} categories over ${months} months.`
            });
        } catch (error) {
            console.error('get_category_trends error:', error);
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    }
};
