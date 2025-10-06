import pool from '../config/database.js';
import encryptionService from '../services/encryptionService.js';
import { authenticate } from '../middleware/auth.js';

export default async function analyticsRoutes(fastify, options) {
    // Add authentication to all routes
    fastify.addHook('preHandler', authenticate);
    
    /**
     * Test database connection
     */
    fastify.get('/test', async (request, reply) => {
        try {
            // Test basic connection
            const testResult = await pool.query('SELECT NOW() as time, current_database() as db');
            
            // Check if transactions table exists
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'transactions'
                ) as table_exists
            `);
            
            return {
                success: true,
                database: testResult.rows[0].db,
                time: testResult.rows[0].time,
                transactionsTableExists: tableCheck.rows[0].table_exists
            };
        } catch (error) {
            return reply.code(500).send({
                error: 'Database test failed',
                message: error.message,
                code: error.code
            });
        }
    });

    /**
     * Get overall spending summary
     */
    fastify.get('/summary', async (request, reply) => {
        const userId = request.user.id; // Get from authenticated user
        const { startDate, endDate, accountId } = request.query;

        try {
            let query = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN kind = '-' THEN amount ELSE 0 END) as total_spent,
                    SUM(CASE WHEN kind = '+' THEN amount ELSE 0 END) as total_income,
                    COUNT(DISTINCT category) as unique_categories,
                    COUNT(DISTINCT DATE_TRUNC('month', transaction_date)) as months_with_data,
                    AVG(CASE WHEN kind = '-' THEN amount END) as avg_expense,
                    AVG(CASE WHEN kind = '+' THEN amount END) as avg_income,
                    MIN(transaction_date) as first_transaction,
                    MAX(transaction_date) as last_transaction
                FROM wheremymoneygoes.transactions
                WHERE user_id = $1
            `;

            const params = [userId];
            let paramCount = 2;

            // Add account filter if specified (not 'all')
            if (accountId && accountId !== 'all') {
                query += ` AND account_id = $${paramCount}`;
                params.push(accountId);
                paramCount++;
            }

            if (startDate) {
                query += ` AND transaction_date >= $${paramCount}`;
                params.push(startDate);
                paramCount++;
            }

            if (endDate) {
                query += ` AND transaction_date <= $${paramCount}`;
                params.push(endDate);
                paramCount++;
            }

            const result = await pool.query(query, params);
            const summary = result.rows[0];

            return {
                success: true,
                data: {
                    totalTransactions: parseInt(summary.total_transactions),
                    totalSpent: parseFloat(summary.total_spent || 0),
                    totalIncome: parseFloat(summary.total_income || 0),
                    netBalance: parseFloat((summary.total_income || 0) - (summary.total_spent || 0)),
                    uniqueCategories: parseInt(summary.unique_categories),
                    monthsWithData: parseInt(summary.months_with_data),
                    avgExpense: parseFloat(summary.avg_expense || 0),
                    avgIncome: parseFloat(summary.avg_income || 0),
                    dateRange: {
                        from: summary.first_transaction,
                        to: summary.last_transaction
                    }
                }
            };
        } catch (error) {
            fastify.log.error('Failed to get summary:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve summary',
                message: error.message,
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    });

    /**
     * Get breakdown by category
     */
    fastify.get('/categories', async (request, reply) => {
        const userId = request.user.id;
        const { startDate, endDate, kind = '-', accountId } = request.query;

        try {
            let query = `
                SELECT 
                    category,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount,
                    MIN(amount) as min_amount,
                    MAX(amount) as max_amount
                FROM wheremymoneygoes.transactions
                WHERE user_id = $1 AND kind = $2
            `;

            const params = [userId, kind];
            let paramCount = 3;

            // Add account filter if specified (not 'all')
            if (accountId && accountId !== 'all') {
                query += ` AND account_id = $${paramCount}`;
                params.push(accountId);
                paramCount++;
            }

            if (startDate) {
                query += ` AND transaction_date >= $${paramCount}`;
                params.push(startDate);
                paramCount++;
            }

            if (endDate) {
                query += ` AND transaction_date <= $${paramCount}`;
                params.push(endDate);
                paramCount++;
            }

            query += `
                GROUP BY category
                ORDER BY total_amount DESC
            `;

            const result = await pool.query(query, params);

            // Calculate percentages
            const total = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0);

            const categories = result.rows.map(row => ({
                category: row.category,
                transactionCount: parseInt(row.transaction_count),
                totalAmount: parseFloat(row.total_amount),
                percentage: total > 0 ? (parseFloat(row.total_amount) / total * 100).toFixed(2) : 0,
                avgAmount: parseFloat(row.avg_amount),
                minAmount: parseFloat(row.min_amount),
                maxAmount: parseFloat(row.max_amount)
            }));

            return {
                success: true,
                data: {
                    categories,
                    total: total,
                    type: kind === '+' ? 'income' : 'expenses'
                }
            };
        } catch (error) {
            fastify.log.error('Failed to get categories:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve categories'
            });
        }
    });

    /**
     * Get top merchants
     */
    fastify.get('/merchants', async (request, reply) => {
        const userId = request.user.id;
        const { limit = 10, startDate, endDate, accountId } = request.query;

        try {
            let query = `
                SELECT 
                    encrypted_data,
                    category,
                    COUNT(*) as visit_count,
                    SUM(amount) as total_spent,
                    AVG(amount) as avg_amount,
                    MAX(transaction_date) as last_visit
                FROM wheremymoneygoes.transactions
                WHERE user_id = $1 AND kind = '-'
            `;

            const params = [userId];
            let paramCount = 2;

            // Add account filter if specified (not 'all')
            if (accountId && accountId !== 'all') {
                query += ` AND account_id = $${paramCount}`;
                params.push(accountId);
                paramCount++;
            }

            if (startDate) {
                query += ` AND transaction_date >= $${paramCount}`;
                params.push(startDate);
                paramCount++;
            }

            if (endDate) {
                query += ` AND transaction_date <= $${paramCount}`;
                params.push(endDate);
                paramCount++;
            }

            query += `
                GROUP BY encrypted_data, category
                ORDER BY total_spent DESC
                LIMIT $${paramCount}
            `;
            params.push(limit);

            const result = await pool.query(query, params);

            // Decrypt merchant names and aggregate
            const merchantMap = new Map();

            for (const row of result.rows) {
                try {
                    const decrypted = encryptionService.decryptJSON(row.encrypted_data);
                    const merchantName = decrypted.merchant_name || 'Unknown';
                    
                    if (merchantMap.has(merchantName)) {
                        const existing = merchantMap.get(merchantName);
                        existing.visitCount += parseInt(row.visit_count);
                        existing.totalSpent += parseFloat(row.total_spent);
                        existing.categories.add(row.category);
                        if (row.last_visit > existing.lastVisit) {
                            existing.lastVisit = row.last_visit;
                        }
                    } else {
                        merchantMap.set(merchantName, {
                            merchantName,
                            merchantType: decrypted.merchant_type,
                            visitCount: parseInt(row.visit_count),
                            totalSpent: parseFloat(row.total_spent),
                            avgAmount: parseFloat(row.avg_amount),
                            categories: new Set([row.category]),
                            lastVisit: row.last_visit
                        });
                    }
                } catch (error) {
                    fastify.log.error('Failed to decrypt merchant data:', error);
                }
            }

            // Convert to array and sort
            const merchants = Array.from(merchantMap.values())
                .map(m => ({
                    ...m,
                    categories: Array.from(m.categories),
                    avgAmount: m.totalSpent / m.visitCount
                }))
                .sort((a, b) => b.totalSpent - a.totalSpent)
                .slice(0, limit);

            return {
                success: true,
                data: merchants
            };
        } catch (error) {
            fastify.log.error('Failed to get merchants:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve merchants'
            });
        }
    });

    /**
     * Get spending trends over time
     */
    fastify.get('/trends', async (request, reply) => {
        const userId = request.user.id;
        const { period = 'month', startDate, endDate, category, merchant, accountId } = request.query;

        try {
            // Validate period parameter to prevent SQL injection
            const validPeriods = ['day', 'week', 'month', 'year'];
            const sanitizedPeriod = validPeriods.includes(period) ? period : 'month';
            
            let dateFormat;
            switch (sanitizedPeriod) {
                case 'day':
                    dateFormat = 'YYYY-MM-DD';
                    break;
                case 'week':
                    dateFormat = 'YYYY-"W"IW';
                    break;
                case 'month':
                default:
                    dateFormat = 'YYYY-MM';
                    break;
                case 'year':
                    dateFormat = 'YYYY';
                    break;
            }

            let query = `
                SELECT 
                    TO_CHAR(transaction_date, '${dateFormat}') as period,
                    SUM(CASE WHEN kind = '-' THEN amount ELSE 0 END) as expenses,
                    SUM(CASE WHEN kind = '+' THEN amount ELSE 0 END) as income,
                    COUNT(CASE WHEN kind = '-' THEN 1 END) as expense_count,
                    COUNT(CASE WHEN kind = '+' THEN 1 END) as income_count
                FROM wheremymoneygoes.transactions
                WHERE user_id = $1
            `;

            const params = [userId];
            let paramCount = 2;

            // Add account filter if specified (not 'all')
            if (accountId && accountId !== 'all') {
                query += ` AND account_id = $${paramCount}`;
                params.push(accountId);
                paramCount++;
            }

            // If no date range specified, default to last 6 months
            if (!startDate && !endDate) {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                query += ` AND transaction_date >= $${paramCount}`;
                params.push(sixMonthsAgo.toISOString().split('T')[0]);
                paramCount++;
            } else {
                if (startDate) {
                    query += ` AND transaction_date >= $${paramCount}`;
                    params.push(startDate);
                    paramCount++;
                }

                if (endDate) {
                    query += ` AND transaction_date <= $${paramCount}`;
                    params.push(endDate);
                    paramCount++;
                }
            }

            // Add category filter if provided
            if (category) {
                query += ` AND category = $${paramCount}`;
                params.push(category);
                paramCount++;
            }

            // Note: Merchant filter would require decrypting data first
            // For now, we'll handle merchant filtering in post-processing

            query += `
                GROUP BY period
                ORDER BY period
            `;

            // If merchant filter is provided, we need to get individual transactions
            // and decrypt them to filter by merchant
            let result;
            if (merchant) {
                // Get individual transactions with encrypted data
                let detailQuery = `
                    SELECT 
                        TO_CHAR(transaction_date, '${dateFormat}') as period,
                        amount,
                        kind,
                        encrypted_data
                    FROM wheremymoneygoes.transactions
                    WHERE user_id = $1
                `;
                
                const detailParams = [userId];
                let detailParamCount = 2;
                
                // Rebuild the same filters as the main query
                // Add account filter if specified (not 'all')
                if (accountId && accountId !== 'all') {
                    detailQuery += ` AND account_id = $${detailParamCount}`;
                    detailParams.push(accountId);
                    detailParamCount++;
                }
                
                // Add date filters
                if (!startDate && !endDate) {
                    // Default to last 6 months
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    detailQuery += ` AND transaction_date >= $${detailParamCount}`;
                    detailParams.push(sixMonthsAgo.toISOString().split('T')[0]);
                    detailParamCount++;
                } else {
                    if (startDate) {
                        detailQuery += ` AND transaction_date >= $${detailParamCount}`;
                        detailParams.push(startDate);
                        detailParamCount++;
                    }
                    
                    if (endDate) {
                        detailQuery += ` AND transaction_date <= $${detailParamCount}`;
                        detailParams.push(endDate);
                        detailParamCount++;
                    }
                }
                
                // Add category filter if provided
                if (category) {
                    detailQuery += ` AND category = $${detailParamCount}`;
                    detailParams.push(category);
                    detailParamCount++;
                }
                
                detailQuery += ` ORDER BY transaction_date`;
                
                const detailResult = await pool.query(detailQuery, detailParams);
                
                // Filter by merchant and aggregate
                const filteredData = new Map();
                
                for (const row of detailResult.rows) {
                    try {
                        const decrypted = encryptionService.decryptJSON(row.encrypted_data);
                        const merchantName = decrypted.merchant_name || 'Unknown';
                        
                        if (merchantName.toLowerCase().includes(merchant.toLowerCase())) {
                            const period = row.period;
                            if (!filteredData.has(period)) {
                                filteredData.set(period, {
                                    expenses: 0,
                                    income: 0,
                                    expense_count: 0,
                                    income_count: 0
                                });
                            }
                            
                            const data = filteredData.get(period);
                            if (row.kind === '-') {
                                data.expenses += parseFloat(row.amount);
                                data.expense_count++;
                            } else {
                                data.income += parseFloat(row.amount);
                                data.income_count++;
                            }
                        }
                    } catch (error) {
                        // Skip rows that can't be decrypted
                    }
                }
                
                // Convert to result format
                result = {
                    rows: Array.from(filteredData.entries()).map(([period, data]) => ({
                        period,
                        expenses: data.expenses,
                        income: data.income,
                        expense_count: data.expense_count,
                        income_count: data.income_count
                    }))
                };
            } else {
                result = await pool.query(query, params);
            }

            const trendsMap = new Map();
            result.rows.forEach(row => {
                trendsMap.set(row.period, {
                    period: row.period,
                    expenses: parseFloat(row.expenses),
                    income: parseFloat(row.income),
                    netFlow: parseFloat(row.income) - parseFloat(row.expenses),
                    expenseCount: parseInt(row.expense_count),
                    incomeCount: parseInt(row.income_count),
                    totalTransactions: parseInt(row.expense_count) + parseInt(row.income_count)
                });
            });

            // Fill in missing periods with zero values
            const trends = [];
            const actualStartDate = startDate ? new Date(startDate) : (() => {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                return sixMonthsAgo;
            })();
            const actualEndDate = endDate ? new Date(endDate) : new Date();

            if (sanitizedPeriod === 'month') {
                const current = new Date(actualStartDate);
                current.setDate(1); // Start from beginning of month
                
                while (current <= actualEndDate) {
                    const periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
                    
                    if (trendsMap.has(periodKey)) {
                        trends.push(trendsMap.get(periodKey));
                    } else {
                        trends.push({
                            period: periodKey,
                            expenses: 0,
                            income: 0,
                            netFlow: 0,
                            expenseCount: 0,
                            incomeCount: 0,
                            totalTransactions: 0
                        });
                    }
                    
                    current.setMonth(current.getMonth() + 1);
                }
            } else {
                // For other periods, just return the data as is
                trends.push(...Array.from(trendsMap.values()).sort((a, b) => a.period.localeCompare(b.period)));
            }

            return {
                success: true,
                data: {
                    period: sanitizedPeriod,
                    trends
                }
            };
        } catch (error) {
            fastify.log.error('Failed to get trends:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve trends'
            });
        }
    });

    /**
     * Get monthly breakdown
     */
    fastify.get('/monthly', async (request, reply) => {
        const userId = request.user.id;
        const { year, accountId } = request.query;

        try {
            let query = `
                SELECT 
                    transaction_month,
                    category,
                    SUM(CASE WHEN kind = '-' THEN amount ELSE 0 END) as expenses,
                    SUM(CASE WHEN kind = '+' THEN amount ELSE 0 END) as income,
                    COUNT(*) as transaction_count
                FROM wheremymoneygoes.transactions
                WHERE user_id = $1
            `;

            const params = [userId];
            let paramCount = 2;

            // Add account filter if specified (not 'all')
            if (accountId && accountId !== 'all') {
                query += ` AND account_id = $${paramCount}`;
                params.push(accountId);
                paramCount++;
            }

            if (year) {
                query += ` AND transaction_year = $${paramCount}`;
                params.push(parseInt(year));
                paramCount++;
            }

            query += `
                GROUP BY transaction_month, category
                ORDER BY transaction_month, expenses DESC
            `;

            const result = await pool.query(query, params);

            // Group by month
            const monthlyData = {};

            for (const row of result.rows) {
                const month = row.transaction_month;
                
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        month,
                        totalExpenses: 0,
                        totalIncome: 0,
                        transactionCount: 0,
                        categories: []
                    };
                }

                monthlyData[month].totalExpenses += parseFloat(row.expenses);
                monthlyData[month].totalIncome += parseFloat(row.income);
                monthlyData[month].transactionCount += parseInt(row.transaction_count);

                if (row.expenses > 0) {
                    monthlyData[month].categories.push({
                        category: row.category,
                        amount: parseFloat(row.expenses),
                        transactionCount: parseInt(row.transaction_count)
                    });
                }
            }

            // Convert to array and calculate additional metrics
            const monthly = Object.values(monthlyData).map(month => ({
                ...month,
                netFlow: month.totalIncome - month.totalExpenses,
                avgExpense: month.transactionCount > 0 ? month.totalExpenses / month.transactionCount : 0,
                topCategories: month.categories.slice(0, 5)
            }));

            return {
                success: true,
                data: monthly
            };
        } catch (error) {
            fastify.log.error('Failed to get monthly data:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve monthly data'
            });
        }
    });
}
