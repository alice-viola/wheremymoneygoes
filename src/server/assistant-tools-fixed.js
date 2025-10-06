import db from './config/database.js';

/**
 * Core transaction tools with correct PostgreSQL column names
 * Based on actual database schema:
 * - transaction_date (not date)
 * - kind ('+' or '-', not transaction_type)
 * - category (not merchant_category)
 * - encrypted_data JSONB contains: description, merchant_name, merchant_type
 */

export const getTransactionsTool = {
    def: {
        type: "function",
        name: "get_transactions",
        description: "Get transactions for analysis with optional filters",
        parameters: {
            type: "object",
            properties: {
                category: {
                    type: "string",
                    description: "Filter by category (e.g., 'Food', 'Transport', 'Shopping')"
                },
                startDate: {
                    type: "string",
                    description: "Start date in YYYY-MM-DD format"
                },
                endDate: {
                    type: "string",
                    description: "End date in YYYY-MM-DD format"
                },
                limit: {
                    type: "number",
                    description: "Maximum number of transactions to return (default 100)"
                }
            },
            required: []
        }
    },
    handler: async (input, state) => {
        try {
            // SECURITY: userId is REQUIRED - never query without it
            if (!state?.userId) {
                throw new Error('User authentication required');
            }
            
            const limit = input.limit || 100;
            let query;
            let params = [];
            
            // Common SELECT clause with proper column mappings
            const selectClause = `
                SELECT 
                    id, 
                    transaction_date as date,
                    encrypted_data->>'description' as description, 
                    amount, 
                    currency,
                    encrypted_data->>'merchant_name' as merchant_name,
                    category as merchant_category,
                    kind as transaction_type,
                    created_at
                FROM transactions
            `;
            
            // All queries MUST filter by userId
            if (input.category && input.startDate && input.endDate) {
                query = selectClause + `
                    WHERE user_id = $1 AND category = $2 AND transaction_date >= $3 AND transaction_date <= $4
                    ORDER BY transaction_date DESC
                    LIMIT $5
                `;
                params = [state.userId, input.category, input.startDate, input.endDate, limit];
            } else if (input.startDate && input.endDate) {
                query = selectClause + `
                    WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date <= $3
                    ORDER BY transaction_date DESC
                    LIMIT $4
                `;
                params = [state.userId, input.startDate, input.endDate, limit];
            } else if (input.category) {
                query = selectClause + `
                    WHERE user_id = $1 AND category = $2
                    ORDER BY transaction_date DESC
                    LIMIT $3
                `;
                params = [state.userId, input.category, limit];
            } else {
                query = selectClause + `
                    WHERE user_id = $1
                    ORDER BY transaction_date DESC
                    LIMIT $2
                `;
                params = [state.userId, limit];
            }
            
            const result = await db.query(query, params);
            
            return JSON.stringify({
                success: true,
                count: result.rows.length,
                transactions: result.rows
            });
        } catch (error) {
            console.error('get_transactions error:', error);
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    }
};

export const getSpendingAnalyticsTool = {
    def: {
        type: "function",
        name: "get_spending_analytics",
        description: "Get spending analytics and insights for a date range",
        parameters: {
            type: "object",
            properties: {
                startDate: {
                    type: "string",
                    description: "Start date in YYYY-MM-DD format"
                },
                endDate: {
                    type: "string",
                    description: "End date in YYYY-MM-DD format"
                }
            },
            required: ["startDate", "endDate"]
        }
    },
    handler: async (input, state) => {
        try {
            // SECURITY: userId is REQUIRED - never query without it
            if (!state?.userId) {
                throw new Error('User authentication required');
            }
            
            let totalQuery, categoryQuery, merchantQuery, trendQuery;
            let totalParams, categoryParams, merchantParams, trendParams;
            
            // All queries MUST filter by userId
                // Queries with user filtering - using kind = '-' for expenses
                totalQuery = `
                    SELECT 
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_spent,
                        AVG(amount) as avg_transaction,
                        MIN(amount) as min_transaction,
                        MAX(amount) as max_transaction
                    FROM transactions
                    WHERE transaction_date >= $1 AND transaction_date <= $2
                        AND kind = '-'
                        AND user_id = $3
                `;
                totalParams = [input.startDate, input.endDate, state.userId];
                
                categoryQuery = `
                    SELECT 
                        category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE transaction_date >= $1 AND transaction_date <= $2
                        AND kind = '-'
                        AND user_id = $3
                        AND category IS NOT NULL
                    GROUP BY category
                    ORDER BY total_amount DESC
                `;
                categoryParams = [input.startDate, input.endDate, state.userId];
                
                merchantQuery = `
                    SELECT 
                        encrypted_data->>'merchant_name' as merchant_name,
                        category as merchant_category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE transaction_date >= $1 AND transaction_date <= $2
                        AND kind = '-'
                        AND encrypted_data->>'merchant_name' IS NOT NULL
                        AND user_id = $3
                    GROUP BY encrypted_data->>'merchant_name', category
                    ORDER BY total_amount DESC
                    LIMIT 10
                `;
                merchantParams = [input.startDate, input.endDate, state.userId];
                
                trendQuery = `
                    SELECT 
                        transaction_date as date,
                        COUNT(*) as transaction_count,
                        SUM(amount) as daily_total
                    FROM transactions
                    WHERE transaction_date >= $1 AND transaction_date <= $2
                        AND kind = '-'
                        AND user_id = $3
                    GROUP BY transaction_date
                    ORDER BY transaction_date
                `;
                trendParams = [input.startDate, input.endDate, state.userId];
            
            // Execute all queries in parallel
            const [totalResult, categoryResult, merchantResult, trendResult] = await Promise.all([
                db.query(totalQuery, totalParams),
                db.query(categoryQuery, categoryParams),
                db.query(merchantQuery, merchantParams),
                db.query(trendQuery, trendParams)
            ]);
            
            return JSON.stringify({
                success: true,
                period: {
                    start: input.startDate,
                    end: input.endDate
                },
                summary: totalResult.rows[0],
                categoryBreakdown: categoryResult.rows,
                topMerchants: merchantResult.rows,
                dailyTrend: trendResult.rows
            });
        } catch (error) {
            console.error('get_spending_analytics error:', error);
            return JSON.stringify({
                success: false,
                error: error.message
            });
        }
    }
};

export const searchTransactionsTool = {
    def: {
        type: "function",
        name: "search_transactions",
        description: "Search transactions by text in description",
        parameters: {
            type: "object",
            properties: {
                searchText: {
                    type: "string",
                    description: "Text to search for in transaction descriptions"
                }
            },
            required: ["searchText"]
        }
    },
    handler: async (input, state) => {
        try {
            // SECURITY: userId is REQUIRED - never query without it
            if (!state?.userId) {
                throw new Error('User authentication required');
            }
            
            const searchPattern = `%${input.searchText}%`;
            let query, params;
            
            query = `
                    SELECT 
                        id, 
                        transaction_date as date,
                        encrypted_data->>'description' as description,
                        amount,
                        currency,
                        encrypted_data->>'merchant_name' as merchant_name,
                        category as merchant_category,
                        kind as transaction_type
                    FROM transactions
                    WHERE user_id = $1 
                      AND encrypted_data->>'description' ILIKE $2
                    ORDER BY transaction_date DESC
                    LIMIT 50
                `;
                params = [state.userId, searchPattern];
            
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
            // SECURITY: userId is REQUIRED - never query without it
            if (!state?.userId) {
                throw new Error('User authentication required');
            }
            
            let currentQuery, previousQuery;
            let currentParams = [], previousParams = [];
            
            // Queries MUST filter by userId
                currentQuery = `
                    SELECT 
                        SUM(amount) as total,
                        COUNT(*) as count,
                        AVG(amount) as average
                    FROM transactions
                    WHERE transaction_date >= date_trunc('month', CURRENT_DATE)
                      AND kind = '-'
                      AND user_id = $1
                `;
                currentParams = [state.userId];
                
                previousQuery = `
                    SELECT 
                        SUM(amount) as total,
                        COUNT(*) as count,
                        AVG(amount) as average
                    FROM transactions
                    WHERE transaction_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                      AND transaction_date < date_trunc('month', CURRENT_DATE)
                      AND kind = '-'
                      AND user_id = $1
                `;
                previousParams = [state.userId];
            
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
            // SECURITY: userId is REQUIRED - never query without it
            if (!state?.userId) {
                throw new Error('User authentication required');
            }
            
            const daysBack = input.daysBack || 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysBack);
            const startDateStr = startDate.toISOString().split('T')[0];
            
            let query, params;
            
            // First get the threshold for this user
                const thresholdQuery = `
                    SELECT AVG(amount) + 2 * STDDEV(amount) as threshold
                    FROM transactions
                    WHERE kind = '-'
                      AND user_id = $1
                      AND transaction_date >= $2
                `;
                const thresholdResult = await db.query(thresholdQuery, [state.userId, startDateStr]);
                const threshold = thresholdResult.rows[0]?.threshold || 0;
                
                // Then get unusual transactions
                query = `
                    SELECT 
                        transaction_date as date,
                        encrypted_data->>'description' as description,
                        amount,
                        encrypted_data->>'merchant_name' as merchant_name,
                        category as merchant_category
                    FROM transactions
                    WHERE transaction_date >= $1
                      AND kind = '-'
                      AND user_id = $2
                      AND amount > $3
                    ORDER BY amount DESC
                    LIMIT 10
                `;
                params = [startDateStr, state.userId, threshold];
            
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
            // SECURITY: userId is REQUIRED - never query without it
            if (!state?.userId) {
                throw new Error('User authentication required');
            }
            
            const minFrequency = input.minFrequency || 3;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startDate = thirtyDaysAgo.toISOString().split('T')[0];
            
            let query, params;
            
            query = `
                    SELECT 
                        encrypted_data->>'merchant_name' as merchant_name,
                        category as merchant_category,
                        COUNT(*) as frequency,
                        SUM(amount) as total_spent,
                        AVG(amount) as avg_amount,
                        MIN(amount) as min_amount,
                        MAX(amount) as max_amount
                    FROM transactions
                    WHERE transaction_date >= $1
                      AND kind = '-'
                      AND encrypted_data->>'merchant_name' IS NOT NULL
                      AND user_id = $2
                    GROUP BY encrypted_data->>'merchant_name', category
                    HAVING COUNT(*) >= $3
                    ORDER BY frequency DESC, total_spent DESC
                    LIMIT 20
                `;
                params = [startDate, state.userId, minFrequency];
            
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
            // SECURITY: userId is REQUIRED - never query without it
            if (!state?.userId) {
                throw new Error('User authentication required');
            }
            
            const months = input.months || 3;
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            const startDateStr = startDate.toISOString().split('T')[0];
            
            let query, params;
            
            query = `
                    SELECT 
                        DATE_TRUNC('month', transaction_date) as month,
                        category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE transaction_date >= $1
                      AND kind = '-'
                      AND user_id = $2
                      AND category IS NOT NULL
                    GROUP BY DATE_TRUNC('month', transaction_date), category
                    ORDER BY month DESC, total_amount DESC
                `;
                params = [startDateStr, state.userId];
            
            const result = await db.query(query, params);
            
            // Group by category to see trends
            const categoryTrends = {};
            result.rows.forEach(row => {
                if (!categoryTrends[row.category]) {
                    categoryTrends[row.category] = [];
                }
                categoryTrends[row.category].push({
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
