import db from './config/database.js';

/**
 * Core transaction tools with clean SQL queries
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
                merchantName: {
                    type: "string",
                    description: "Filter by merchant name (partial match)"
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
            const limit = input.limit || 100;
            let query;
            let params = [];
            
            // Build query based on what filters are provided
            if (state?.userId) {
                if (input.category && input.startDate && input.endDate && input.merchantName) {
                    query = `
                        SELECT id, transaction_date as date, encrypted_data->>'description' as description, 
                               amount, currency, encrypted_data->>'merchant_name' as merchant_name, 
                               category as merchant_category, kind as transaction_type, created_at
                        FROM transactions
                        WHERE user_id = $1 AND category = $2 AND transaction_date >= $3 AND transaction_date <= $4 
                               AND encrypted_data->>'merchant_name' ILIKE $5
                        ORDER BY transaction_date DESC
                        LIMIT $6
                    `;
                    params = [state.userId, input.category, input.startDate, input.endDate, `%${input.merchantName}%`, limit];
                } else if (input.category && input.startDate && input.endDate) {
                    query = `
                        SELECT id, date, description, amount, currency, merchant_name, merchant_category, transaction_type, created_at
                        FROM transactions
                        WHERE user_id = $1 AND merchant_category = $2 AND date >= $3 AND date <= $4
                        ORDER BY date DESC
                        LIMIT $5
                    `;
                    params = [state.userId, input.category, input.startDate, input.endDate, limit];
                } else if (input.startDate && input.endDate) {
                    query = `
                        SELECT id, date, description, amount, currency, merchant_name, merchant_category, transaction_type, created_at
                        FROM transactions
                        WHERE user_id = $1 AND date >= $2 AND date <= $3
                        ORDER BY date DESC
                        LIMIT $4
                    `;
                    params = [state.userId, input.startDate, input.endDate, limit];
                } else if (input.category) {
                    query = `
                        SELECT id, date, description, amount, currency, merchant_name, merchant_category, transaction_type, created_at
                        FROM transactions
                        WHERE user_id = $1 AND merchant_category = $2
                        ORDER BY date DESC
                        LIMIT $3
                    `;
                    params = [state.userId, input.category, limit];
                } else if (input.merchantName) {
                    query = `
                        SELECT id, date, description, amount, currency, merchant_name, merchant_category, transaction_type, created_at
                        FROM transactions
                        WHERE user_id = $1 AND merchant_name ILIKE $2
                        ORDER BY date DESC
                        LIMIT $3
                    `;
                    params = [state.userId, `%${input.merchantName}%`, limit];
                } else {
                    query = `
                        SELECT id, date, description, amount, currency, merchant_name, merchant_category, transaction_type, created_at
                        FROM transactions
                        WHERE user_id = $1
                        ORDER BY date DESC
                        LIMIT $2
                    `;
                    params = [state.userId, limit];
                }
            } else {
                // Queries without user_id filter
                if (input.startDate && input.endDate) {
                    query = `
                        SELECT id, date, description, amount, currency, merchant_name, merchant_category, transaction_type, created_at
                        FROM transactions
                        WHERE date >= $1 AND date <= $2
                        ORDER BY date DESC
                        LIMIT $3
                    `;
                    params = [input.startDate, input.endDate, limit];
                } else {
                    query = `
                        SELECT id, date, description, amount, currency, merchant_name, merchant_category, transaction_type, created_at
                        FROM transactions
                        ORDER BY date DESC
                        LIMIT $1
                    `;
                    params = [limit];
                }
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
                },
                groupBy: {
                    type: "string",
                    enum: ["category", "merchant", "day", "week", "month"],
                    description: "How to group the spending data"
                }
            },
            required: ["startDate", "endDate"]
        }
    },
    handler: async (input, state) => {
        try {
            let totalQuery, categoryQuery, merchantQuery, trendQuery;
            let totalParams, categoryParams, merchantParams, trendParams;
            
            // Define queries based on whether we have a userId
            if (state?.userId) {
                // Queries with user filtering
                totalQuery = `
                    SELECT 
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_spent,
                        AVG(amount) as avg_transaction,
                        MIN(amount) as min_transaction,
                        MAX(amount) as max_transaction
                    FROM transactions
                    WHERE date >= $1 AND date <= $2
                        AND transaction_type = 'debit'
                        AND user_id = $3
                `;
                totalParams = [input.startDate, input.endDate, state.userId];
                
                categoryQuery = `
                    SELECT 
                        merchant_category as category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE date >= $1 AND date <= $2
                        AND transaction_type = 'debit'
                        AND user_id = $3
                    GROUP BY merchant_category
                    ORDER BY total_amount DESC
                `;
                categoryParams = [input.startDate, input.endDate, state.userId];
                
                merchantQuery = `
                    SELECT 
                        merchant_name,
                        merchant_category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE date >= $1 AND date <= $2
                        AND transaction_type = 'debit'
                        AND merchant_name IS NOT NULL
                        AND user_id = $3
                    GROUP BY merchant_name, merchant_category
                    ORDER BY total_amount DESC
                    LIMIT 10
                `;
                merchantParams = [input.startDate, input.endDate, state.userId];
                
                trendQuery = `
                    SELECT 
                        date,
                        COUNT(*) as transaction_count,
                        SUM(amount) as daily_total
                    FROM transactions
                    WHERE date >= $1 AND date <= $2
                        AND transaction_type = 'debit'
                        AND user_id = $3
                    GROUP BY date
                    ORDER BY date
                `;
                trendParams = [input.startDate, input.endDate, state.userId];
            } else {
                // Queries without user filtering
                totalQuery = `
                    SELECT 
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_spent,
                        AVG(amount) as avg_transaction,
                        MIN(amount) as min_transaction,
                        MAX(amount) as max_transaction
                    FROM transactions
                    WHERE date >= $1 AND date <= $2
                        AND transaction_type = 'debit'
                `;
                totalParams = [input.startDate, input.endDate];
                
                categoryQuery = `
                    SELECT 
                        merchant_category as category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE date >= $1 AND date <= $2
                        AND transaction_type = 'debit'
                    GROUP BY merchant_category
                    ORDER BY total_amount DESC
                `;
                categoryParams = [input.startDate, input.endDate];
                
                merchantQuery = `
                    SELECT 
                        merchant_name,
                        merchant_category,
                        COUNT(*) as transaction_count,
                        SUM(amount) as total_amount,
                        AVG(amount) as avg_amount
                    FROM transactions
                    WHERE date >= $1 AND date <= $2
                        AND transaction_type = 'debit'
                        AND merchant_name IS NOT NULL
                    GROUP BY merchant_name, merchant_category
                    ORDER BY total_amount DESC
                    LIMIT 10
                `;
                merchantParams = [input.startDate, input.endDate];
                
                trendQuery = `
                    SELECT 
                        date,
                        COUNT(*) as transaction_count,
                        SUM(amount) as daily_total
                    FROM transactions
                    WHERE date >= $1 AND date <= $2
                        AND transaction_type = 'debit'
                    GROUP BY date
                    ORDER BY date
                `;
                trendParams = [input.startDate, input.endDate];
            }
            
            // Execute all queries in parallel for better performance
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
