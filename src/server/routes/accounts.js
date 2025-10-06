import pool from '../config/database.js';
import encryptionService from '../services/encryptionService.js';
import { authenticate } from '../middleware/auth.js';

export default async function accountRoutes(fastify, options) {
    // Add authentication to all routes
    fastify.addHook('preHandler', authenticate);
    
    /**
     * Get all accounts for a user
     */
    fastify.get('/', async (request, reply) => {
        const userId = request.user.id;
        const { includeInactive = false } = request.query;

        try {
            let query = `
                SELECT 
                    id,
                    user_id,
                    account_name,
                    account_type,
                    bank_name,
                    account_number_last4,
                    currency,
                    color,
                    icon,
                    is_active,
                    is_default,
                    balance,
                    created_at,
                    updated_at,
                    (
                        SELECT COUNT(*) 
                        FROM wheremymoneygoes.transactions t 
                        WHERE t.account_id = a.id
                    ) as transaction_count,
                    (
                        SELECT MAX(transaction_date) 
                        FROM wheremymoneygoes.transactions t 
                        WHERE t.account_id = a.id
                    ) as last_transaction_date
                FROM wheremymoneygoes.accounts a
                WHERE a.user_id = $1
            `;

            const params = [userId];
            
            if (!includeInactive) {
                query += ` AND a.is_active = true`;
            }

            query += ` ORDER BY a.is_default DESC, a.created_at ASC`;

            const result = await pool.query(query, params);

            // Decrypt sensitive data
            const accounts = result.rows.map(row => {
                let decryptedLast4 = null;
                if (row.account_number_last4) {
                    try {
                        decryptedLast4 = encryptionService.decrypt(row.account_number_last4);
                    } catch (error) {
                        fastify.log.error('Failed to decrypt account number:', error);
                    }
                }

                return {
                    id: row.id,
                    userId: row.user_id,
                    accountName: row.account_name,
                    accountType: row.account_type,
                    bankName: row.bank_name,
                    accountNumberLast4: decryptedLast4,
                    currency: row.currency,
                    color: row.color,
                    icon: row.icon,
                    isActive: row.is_active,
                    isDefault: row.is_default,
                    balance: parseFloat(row.balance || 0),
                    transactionCount: parseInt(row.transaction_count),
                    lastTransactionDate: row.last_transaction_date,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
            });

            return {
                success: true,
                data: accounts
            };
        } catch (error) {
            fastify.log.error('Failed to get accounts:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve accounts',
                message: error.message
            });
        }
    });

    /**
     * Get single account details
     */
    fastify.get('/:accountId', async (request, reply) => {
        const userId = request.user.id;
        const { accountId } = request.params;

        try {
            const query = `
                SELECT 
                    a.*,
                    (
                        SELECT COUNT(*) 
                        FROM wheremymoneygoes.transactions t 
                        WHERE t.account_id = a.id
                    ) as transaction_count,
                    (
                        SELECT SUM(CASE WHEN kind = '+' THEN amount ELSE -amount END)
                        FROM wheremymoneygoes.transactions t 
                        WHERE t.account_id = a.id
                    ) as calculated_balance
                FROM wheremymoneygoes.accounts a
                WHERE a.id = $1 AND a.user_id = $2
            `;

            const result = await pool.query(query, [accountId, userId]);

            if (result.rows.length === 0) {
                return reply.code(404).send({
                    error: 'Account not found'
                });
            }

            const row = result.rows[0];
            let decryptedLast4 = null;
            if (row.account_number_last4) {
                try {
                    decryptedLast4 = encryptionService.decrypt(row.account_number_last4);
                } catch (error) {
                    fastify.log.error('Failed to decrypt account number:', error);
                }
            }

            return {
                success: true,
                data: {
                    id: row.id,
                    userId: row.user_id,
                    accountName: row.account_name,
                    accountType: row.account_type,
                    bankName: row.bank_name,
                    accountNumberLast4: decryptedLast4,
                    currency: row.currency,
                    color: row.color,
                    icon: row.icon,
                    isActive: row.is_active,
                    isDefault: row.is_default,
                    balance: parseFloat(row.balance || 0),
                    calculatedBalance: parseFloat(row.calculated_balance || 0),
                    transactionCount: parseInt(row.transaction_count),
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }
            };
        } catch (error) {
            fastify.log.error('Failed to get account:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve account',
                message: error.message
            });
        }
    });

    /**
     * Create new account
     */
    fastify.post('/', async (request, reply) => {
        const userId = request.user.id; // Get userId from authenticated user
        const {
            accountName,
            accountType = 'checking',
            bankName,
            accountNumberLast4,
            currency = 'EUR',
            color = '#3b82f6',
            icon = 'BuildingLibraryIcon',
            isDefault = false,
            balance = 0
        } = request.body;

        if (!accountName) {
            return reply.code(400).send({
                error: 'accountName is required'
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // If this should be the default, unset other defaults
            if (isDefault) {
                await client.query(
                    `UPDATE wheremymoneygoes.accounts 
                     SET is_default = false 
                     WHERE user_id = $1 AND is_default = true`,
                    [userId]
                );
            }

            // Check if this is the first account for the user
            const countResult = await client.query(
                'SELECT COUNT(*) as count FROM wheremymoneygoes.accounts WHERE user_id = $1',
                [userId]
            );
            const isFirstAccount = countResult.rows[0].count === '0';

            // Encrypt sensitive data
            const encryptedLast4 = accountNumberLast4 ? 
                encryptionService.encrypt(accountNumberLast4) : null;

            // Insert new account
            const insertQuery = `
                INSERT INTO wheremymoneygoes.accounts (
                    user_id, account_name, account_type, bank_name, 
                    account_number_last4, currency, color, icon, 
                    is_default, balance, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
                RETURNING *
            `;

            const result = await client.query(insertQuery, [
                userId,
                accountName,
                accountType,
                bankName,
                encryptedLast4,
                currency,
                color,
                icon,
                isDefault || isFirstAccount, // First account is always default
                balance
            ]);

            await client.query('COMMIT');

            const account = result.rows[0];
            return {
                success: true,
                data: {
                    id: account.id,
                    userId: account.user_id,
                    accountName: account.account_name,
                    accountType: account.account_type,
                    bankName: account.bank_name,
                    accountNumberLast4: accountNumberLast4,
                    currency: account.currency,
                    color: account.color,
                    icon: account.icon,
                    isActive: account.is_active,
                    isDefault: account.is_default,
                    balance: parseFloat(account.balance),
                    createdAt: account.created_at,
                    updatedAt: account.updated_at
                }
            };
        } catch (error) {
            await client.query('ROLLBACK');
            fastify.log.error('Failed to create account:', error);
            return reply.code(500).send({
                error: 'Failed to create account',
                message: error.message
            });
        } finally {
            client.release();
        }
    });

    /**
     * Update account
     */
    fastify.patch('/:accountId', async (request, reply) => {
        const userId = request.user.id; // Get userId from authenticated user
        const { accountId } = request.params;
        const {
            accountName,
            accountType,
            bankName,
            accountNumberLast4,
            currency,
            color,
            icon,
            isActive,
            isDefault,
            balance
        } = request.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify ownership
            const ownerCheck = await client.query(
                'SELECT id FROM wheremymoneygoes.accounts WHERE id = $1 AND user_id = $2',
                [accountId, userId]
            );

            if (ownerCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return reply.code(404).send({
                    error: 'Account not found or access denied'
                });
            }

            // If setting as default, unset other defaults
            if (isDefault === true) {
                await client.query(
                    `UPDATE wheremymoneygoes.accounts 
                     SET is_default = false 
                     WHERE user_id = $1 AND is_default = true AND id != $2`,
                    [userId, accountId]
                );
            }

            // Build update query dynamically
            const updates = [];
            const values = [];
            let paramCount = 1;

            if (accountName !== undefined) {
                updates.push(`account_name = $${paramCount}`);
                values.push(accountName);
                paramCount++;
            }

            if (accountType !== undefined) {
                updates.push(`account_type = $${paramCount}`);
                values.push(accountType);
                paramCount++;
            }

            if (bankName !== undefined) {
                updates.push(`bank_name = $${paramCount}`);
                values.push(bankName);
                paramCount++;
            }

            if (accountNumberLast4 !== undefined) {
                const encryptedLast4 = accountNumberLast4 ? 
                    encryptionService.encrypt(accountNumberLast4) : null;
                updates.push(`account_number_last4 = $${paramCount}`);
                values.push(encryptedLast4);
                paramCount++;
            }

            if (currency !== undefined) {
                updates.push(`currency = $${paramCount}`);
                values.push(currency);
                paramCount++;
            }

            if (color !== undefined) {
                updates.push(`color = $${paramCount}`);
                values.push(color);
                paramCount++;
            }

            if (icon !== undefined) {
                updates.push(`icon = $${paramCount}`);
                values.push(icon);
                paramCount++;
            }

            if (isActive !== undefined) {
                updates.push(`is_active = $${paramCount}`);
                values.push(isActive);
                paramCount++;
            }

            if (isDefault !== undefined) {
                updates.push(`is_default = $${paramCount}`);
                values.push(isDefault);
                paramCount++;
            }

            if (balance !== undefined) {
                updates.push(`balance = $${paramCount}`);
                values.push(balance);
                paramCount++;
            }

            updates.push(`updated_at = NOW()`);

            values.push(accountId);
            const updateQuery = `
                UPDATE wheremymoneygoes.accounts 
                SET ${updates.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await client.query(updateQuery, values);
            await client.query('COMMIT');

            const account = result.rows[0];
            return {
                success: true,
                data: {
                    id: account.id,
                    userId: account.user_id,
                    accountName: account.account_name,
                    accountType: account.account_type,
                    bankName: account.bank_name,
                    accountNumberLast4: accountNumberLast4 !== undefined ? accountNumberLast4 : undefined,
                    currency: account.currency,
                    color: account.color,
                    icon: account.icon,
                    isActive: account.is_active,
                    isDefault: account.is_default,
                    balance: parseFloat(account.balance),
                    createdAt: account.created_at,
                    updatedAt: account.updated_at
                }
            };
        } catch (error) {
            await client.query('ROLLBACK');
            fastify.log.error('Failed to update account:', error);
            return reply.code(500).send({
                error: 'Failed to update account',
                message: error.message
            });
        } finally {
            client.release();
        }
    });

    /**
     * Delete account
     */
    fastify.delete('/:accountId', async (request, reply) => {
        const userId = request.user.id; // Get userId from authenticated user
        const { accountId } = request.params;
        const { deleteTransactions = false } = request.body;

        // Debug logging
        fastify.log.info(`Delete account request - accountId: ${accountId}, userId: ${userId}`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify ownership and check if default
            const accountCheck = await client.query(
                'SELECT id, is_default FROM wheremymoneygoes.accounts WHERE id = $1 AND user_id = $2',
                [accountId, userId]
            );

            fastify.log.info(`Account check result - found: ${accountCheck.rows.length} rows`);

            if (accountCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                
                // Additional debug: check if account exists at all
                const accountExists = await client.query(
                    'SELECT id, user_id FROM wheremymoneygoes.accounts WHERE id = $1',
                    [accountId]
                );
                
                if (accountExists.rows.length > 0) {
                    fastify.log.error(`Account ${accountId} exists but belongs to user ${accountExists.rows[0].user_id}, not ${userId}`);
                } else {
                    fastify.log.error(`Account ${accountId} does not exist`);
                }
                
                return reply.code(404).send({
                    error: 'Account not found or access denied'
                });
            }

            const isDefault = accountCheck.rows[0].is_default;

            // Check if this is the last account
            const countResult = await client.query(
                'SELECT COUNT(*) as count FROM wheremymoneygoes.accounts WHERE user_id = $1',
                [userId]
            );

            if (countResult.rows[0].count === '1') {
                await client.query('ROLLBACK');
                return reply.code(400).send({
                    error: 'Cannot delete the last account'
                });
            }

            // Get transaction count
            const txCountResult = await client.query(
                'SELECT COUNT(*) as count FROM wheremymoneygoes.transactions WHERE account_id = $1',
                [accountId]
            );
            const transactionCount = parseInt(txCountResult.rows[0].count);

            if (!deleteTransactions && transactionCount > 0) {
                await client.query('ROLLBACK');
                return reply.code(400).send({
                    error: 'Account has transactions',
                    message: `This account has ${transactionCount} transactions. Set deleteTransactions to true to delete them.`,
                    transactionCount
                });
            }

            // Delete the account (cascade will handle related records if deleteTransactions is true)
            await client.query(
                'DELETE FROM wheremymoneygoes.accounts WHERE id = $1',
                [accountId]
            );

            // If we deleted the default account, set another as default
            if (isDefault) {
                await client.query(
                    `UPDATE wheremymoneygoes.accounts 
                     SET is_default = true 
                     WHERE user_id = $1 AND is_active = true
                     AND id = (
                         SELECT id FROM wheremymoneygoes.accounts 
                         WHERE user_id = $1 AND is_active = true
                         ORDER BY created_at ASC
                         LIMIT 1
                     )`,
                    [userId]
                );
            }

            await client.query('COMMIT');

            return {
                success: true,
                message: 'Account deleted successfully',
                deletedTransactions: deleteTransactions ? transactionCount : 0
            };
        } catch (error) {
            await client.query('ROLLBACK');
            fastify.log.error('Failed to delete account:', error);
            return reply.code(500).send({
                error: 'Failed to delete account',
                message: error.message
            });
        } finally {
            client.release();
        }
    });

    /**
     * Set default account
     */
    fastify.post('/:accountId/set-default', async (request, reply) => {
        const userId = request.user.id; // Get userId from authenticated user
        const { accountId } = request.params;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify ownership
            const ownerCheck = await client.query(
                'SELECT id FROM wheremymoneygoes.accounts WHERE id = $1 AND user_id = $2',
                [accountId, userId]
            );

            if (ownerCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return reply.code(404).send({
                    error: 'Account not found or access denied'
                });
            }

            // Unset current default
            await client.query(
                'UPDATE wheremymoneygoes.accounts SET is_default = false WHERE user_id = $1',
                [userId]
            );

            // Set new default
            await client.query(
                'UPDATE wheremymoneygoes.accounts SET is_default = true WHERE id = $1',
                [accountId]
            );

            await client.query('COMMIT');

            return {
                success: true,
                message: 'Default account updated successfully'
            };
        } catch (error) {
            await client.query('ROLLBACK');
            fastify.log.error('Failed to set default account:', error);
            return reply.code(500).send({
                error: 'Failed to set default account',
                message: error.message
            });
        } finally {
            client.release();
        }
    });

    /**
     * Get account summary statistics
     */
    fastify.get('/:accountId/summary', async (request, reply) => {
        const userId = request.user.id;
        const { accountId } = request.params;
        const { startDate, endDate } = request.query;

        try {
            // Verify ownership
            const ownerCheck = await pool.query(
                'SELECT id FROM wheremymoneygoes.accounts WHERE id = $1 AND user_id = $2',
                [accountId, userId]
            );

            if (ownerCheck.rows.length === 0) {
                return reply.code(404).send({
                    error: 'Account not found or access denied'
                });
            }

            let query = `
                SELECT 
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN kind = '-' THEN amount ELSE 0 END) as total_spent,
                    SUM(CASE WHEN kind = '+' THEN amount ELSE 0 END) as total_income,
                    SUM(CASE WHEN kind = '+' THEN amount ELSE -amount END) as net_balance,
                    COUNT(DISTINCT category) as unique_categories,
                    MIN(transaction_date) as first_transaction,
                    MAX(transaction_date) as last_transaction
                FROM wheremymoneygoes.transactions
                WHERE account_id = $1
            `;

            const params = [accountId];
            let paramCount = 2;

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
                    accountId,
                    totalTransactions: parseInt(summary.total_transactions),
                    totalSpent: parseFloat(summary.total_spent || 0),
                    totalIncome: parseFloat(summary.total_income || 0),
                    netBalance: parseFloat(summary.net_balance || 0),
                    uniqueCategories: parseInt(summary.unique_categories),
                    dateRange: {
                        from: summary.first_transaction,
                        to: summary.last_transaction
                    }
                }
            };
        } catch (error) {
            fastify.log.error('Failed to get account summary:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve account summary',
                message: error.message
            });
        }
    });
}
