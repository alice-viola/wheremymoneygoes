import pool from '../config/database.js';
import encryptionService from '../services/encryptionService.js';
import { authenticate } from '../middleware/auth.js';

export default async function transactionRoutes(fastify, options) {
    // Add authentication to all routes
    fastify.addHook('preHandler', authenticate);
    
    /**
     * Get user transactions
     */
    fastify.get('/', async (request, reply) => {
        const userId = request.user.id; // Get from authenticated user
        const { 
            limit = 50, 
            offset = 0,
            category,
            startDate,
            endDate,
            uploadId,
            accountId
        } = request.query;

        try {
            let query = `
                SELECT 
                    t.id,
                    t.transaction_date,
                    t.kind,
                    t.amount,
                    t.currency,
                    t.category,
                    t.encrypted_data,
                    t.confidence,
                    t.upload_id,
                    t.created_at
                FROM wheremymoneygoes.transactions t
                WHERE t.user_id = $1
            `;

            const params = [userId];
            let paramCount = 2;

            // Add account filter if specified (not 'all')
            if (accountId && accountId !== 'all') {
                query += ` AND t.account_id = $${paramCount}`;
                params.push(accountId);
                paramCount++;
            }

            // Add filters
            if (category) {
                query += ` AND t.category = $${paramCount}`;
                params.push(category);
                paramCount++;
            }

            if (startDate) {
                query += ` AND t.transaction_date >= $${paramCount}`;
                params.push(startDate);
                paramCount++;
            }

            if (endDate) {
                query += ` AND t.transaction_date <= $${paramCount}`;
                params.push(endDate);
                paramCount++;
            }

            if (uploadId) {
                query += ` AND t.upload_id = $${paramCount}`;
                params.push(uploadId);
                paramCount++;
            }

            query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;
            query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
            params.push(limit, offset);

            const result = await pool.query(query, params);

            // Decrypt sensitive data
            const transactions = result.rows.map(row => {
                let decryptedData = {};
                try {
                    // encrypted_data is JSONB column, already parsed by pg driver
                    decryptedData = encryptionService.decryptJSON(row.encrypted_data);
                } catch (error) {
                    fastify.log.error('Failed to decrypt transaction data:', error);
                }

                return {
                    id: row.id,
                    date: row.transaction_date,
                    kind: row.kind,
                    amount: parseFloat(row.amount),
                    currency: row.currency,
                    category: row.category,
                    subcategory: decryptedData.subcategory,
                    description: decryptedData.description,
                    merchantName: decryptedData.merchant_name,
                    merchantType: decryptedData.merchant_type,
                    code: decryptedData.code,
                    confidence: parseFloat(row.confidence),
                    uploadId: row.upload_id,
                    createdAt: row.created_at
                };
            });

            // Get total count
            let countQuery = `
                SELECT COUNT(*) as total
                FROM wheremymoneygoes.transactions t
                WHERE t.user_id = $1
            `;
            
            const countParams = [userId];
            let countParamCount = 2;

            // Add account filter if specified (not 'all')
            if (accountId && accountId !== 'all') {
                countQuery += ` AND t.account_id = $${countParamCount}`;
                countParams.push(accountId);
                countParamCount++;
            }

            if (category) {
                countQuery += ` AND t.category = $${countParamCount}`;
                countParams.push(category);
                countParamCount++;
            }

            if (startDate) {
                countQuery += ` AND t.transaction_date >= $${countParamCount}`;
                countParams.push(startDate);
                countParamCount++;
            }

            if (endDate) {
                countQuery += ` AND t.transaction_date <= $${countParamCount}`;
                countParams.push(endDate);
                countParamCount++;
            }

            if (uploadId) {
                countQuery += ` AND t.upload_id = $${countParamCount}`;
                countParams.push(uploadId);
                countParamCount++;
            }

            const countResult = await pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);

            return {
                success: true,
                data: transactions,
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
                }
            };
        } catch (error) {
            fastify.log.error('Failed to get transactions:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve transactions'
            });
        }
    });

    /**
     * Get single transaction
     */
    fastify.get('/:transactionId', async (request, reply) => {
        const userId = request.user.id;
        const { transactionId } = request.params;

        try {
            const query = `
                SELECT 
                    t.*,
                    u.filename as upload_filename
                FROM wheremymoneygoes.transactions t
                LEFT JOIN wheremymoneygoes.uploads u ON t.upload_id = u.id
                WHERE t.id = $1 AND t.user_id = $2
            `;

            const result = await pool.query(query, [transactionId, userId]);

            if (result.rows.length === 0) {
                return reply.code(404).send({
                    error: 'Transaction not found'
                });
            }

            const row = result.rows[0];
            
            // Decrypt data
            let decryptedData = {};
            try {
                decryptedData = encryptionService.decryptJSON(row.encrypted_data);
            } catch (error) {
                fastify.log.error('Failed to decrypt transaction data:', error);
            }

            let uploadFilename = 'Unknown';
            if (row.upload_filename) {
                try {
                    uploadFilename = encryptionService.decrypt(JSON.parse(row.upload_filename));
                } catch (error) {
                    fastify.log.error('Failed to decrypt filename:', error);
                }
            }

            return {
                success: true,
                data: {
                    id: row.id,
                    date: row.transaction_date,
                    kind: row.kind,
                    amount: parseFloat(row.amount),
                    currency: row.currency,
                    category: row.category,
                    subcategory: decryptedData.subcategory,
                    description: decryptedData.description,
                    merchantName: decryptedData.merchant_name,
                    merchantType: decryptedData.merchant_type,
                    code: decryptedData.code,
                    confidence: parseFloat(row.confidence),
                    uploadId: row.upload_id,
                    uploadFilename,
                    createdAt: row.created_at
                }
            };
        } catch (error) {
            fastify.log.error('Failed to get transaction:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve transaction'
            });
        }
    });

    /**
     * Update transaction (fix categorization)
     */
    fastify.patch('/:transactionId', async (request, reply) => {
        const userId = request.user.id;
        const { transactionId } = request.params;
        const { category, subcategory, merchantName } = request.body;

        try {
            // Verify ownership
            const checkQuery = `
                SELECT encrypted_data 
                FROM wheremymoneygoes.transactions 
                WHERE id = $1 AND user_id = $2
            `;
            const checkResult = await pool.query(checkQuery, [transactionId, userId]);

            if (checkResult.rows.length === 0) {
                return reply.code(404).send({
                    error: 'Transaction not found'
                });
            }

            // Get current encrypted data
            let currentData = {};
            try {
                currentData = encryptionService.decryptJSON(checkResult.rows[0].encrypted_data);
            } catch (error) {
                fastify.log.error('Failed to decrypt current data:', error);
            }

            // Update fields
            if (subcategory !== undefined) currentData.subcategory = subcategory;
            if (merchantName !== undefined) currentData.merchant_name = merchantName;

            // Re-encrypt
            const newEncryptedData = encryptionService.encryptJSON(currentData);

            // Update transaction
            const updateQuery = `
                UPDATE transactions
                SET 
                    category = COALESCE($1, category),
                    encrypted_data = $2,
                    confidence = 1.0
                WHERE id = $3 AND user_id = $4
            `;

            await pool.query(updateQuery, [
                category,
                JSON.stringify(newEncryptedData),
                transactionId,
                userId
            ]);

            return {
                success: true,
                message: 'Transaction updated successfully'
            };
        } catch (error) {
            fastify.log.error('Failed to update transaction:', error);
            return reply.code(500).send({
                error: 'Failed to update transaction'
            });
        }
    });

    /**
     * Delete ALL transactions for a user (cleanup)
     */
    fastify.delete('/cleanup/all', async (request, reply) => {
        const userId = request.user.id;
        const { includeRawData = true } = request.query;
        
        try {
            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');
                
                // Get upload IDs for this user
                const uploadsResult = await client.query(
                    'SELECT id FROM wheremymoneygoes.uploads WHERE user_id = $1',
                    [userId]
                );
                
                const uploadIds = uploadsResult.rows.map(row => row.id);
                
                // Delete transactions
                const transResult = await client.query(
                    'DELETE FROM wheremymoneygoes.transactions WHERE user_id = $1',
                    [userId]
                );
                
                // Delete merchant cache entries for this user
                const merchantResult = await client.query(
                    'DELETE FROM wheremymoneygoes.merchant_cache WHERE user_id = $1',
                    [userId]
                );
                
                let rawLinesDeleted = 0;
                let queueDeleted = 0;
                let uploadsDeleted = 0;
                
                if (includeRawData && uploadIds.length > 0) {
                    // Delete raw CSV lines
                    const rawResult = await client.query(
                        'DELETE FROM wheremymoneygoes.raw_csv_lines WHERE user_id = $1',
                        [userId]
                    );
                    rawLinesDeleted = rawResult.rowCount;
                    
                    // Delete processing queue entries
                    const queueResult = await client.query(
                        'DELETE FROM wheremymoneygoes.processing_queue WHERE user_id = $1',
                        [userId]
                    );
                    queueDeleted = queueResult.rowCount;
                    
                    // Delete uploads
                    const uploadResult = await client.query(
                        'DELETE FROM wheremymoneygoes.uploads WHERE user_id = $1',
                        [userId]
                    );
                    uploadsDeleted = uploadResult.rowCount;
                }
                
                await client.query('COMMIT');
                
                return {
                    success: true,
                    deleted: {
                        transactions: transResult.rowCount,
                        merchantCache: merchantResult.rowCount,
                        rawLines: rawLinesDeleted,
                        processingQueue: queueDeleted,
                        uploads: uploadsDeleted
                    },
                    message: includeRawData 
                        ? 'All transactions and raw data deleted successfully'
                        : 'All transactions deleted successfully'
                };
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
            
        } catch (error) {
            fastify.log.error('Failed to cleanup transactions:', error);
            return reply.code(500).send({
                error: 'Failed to cleanup transactions',
                message: error.message
            });
        }
    });

    /**
     * Delete transaction
     */
    fastify.delete('/:transactionId', async (request, reply) => {
        const userId = request.user.id;
        const { transactionId } = request.params;

        try {
            const query = `
                DELETE FROM wheremymoneygoes.transactions
                WHERE id = $1 AND user_id = $2
                RETURNING id
            `;

            const result = await pool.query(query, [transactionId, userId]);

            if (result.rows.length === 0) {
                return reply.code(404).send({
                    error: 'Transaction not found'
                });
            }

            return {
                success: true,
                message: 'Transaction deleted successfully'
            };
        } catch (error) {
            fastify.log.error('Failed to delete transaction:', error);
            return reply.code(500).send({
                error: 'Failed to delete transaction'
            });
        }
    });

    /**
     * Export transactions
     */
    fastify.get('/export', async (request, reply) => {
        const userId = request.user.id;
        const { format = 'json', startDate, endDate } = request.query;

        try {
            let query = `
                SELECT 
                    t.transaction_date,
                    t.kind,
                    t.amount,
                    t.currency,
                    t.category,
                    t.encrypted_data,
                    t.confidence
                FROM wheremymoneygoes.transactions t
                WHERE t.user_id = $1
            `;

            const params = [userId];
            let paramCount = 2;

            if (startDate) {
                query += ` AND t.transaction_date >= $${paramCount}`;
                params.push(startDate);
                paramCount++;
            }

            if (endDate) {
                query += ` AND t.transaction_date <= $${paramCount}`;
                params.push(endDate);
                paramCount++;
            }

            query += ` ORDER BY t.transaction_date DESC`;

            const result = await pool.query(query, params);

            // Decrypt and format data
            const transactions = result.rows.map(row => {
                let decryptedData = {};
                try {
                    decryptedData = encryptionService.decryptJSON(row.encrypted_data);
                } catch (error) {
                    fastify.log.error('Failed to decrypt transaction data:', error);
                }

                return {
                    date: row.transaction_date,
                    type: row.kind === '+' ? 'income' : 'expense',
                    amount: parseFloat(row.amount),
                    currency: row.currency,
                    category: row.category,
                    subcategory: decryptedData.subcategory,
                    description: decryptedData.description,
                    merchant: decryptedData.merchant_name
                };
            });

            if (format === 'csv') {
                // Convert to CSV
                const headers = ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Subcategory', 'Description', 'Merchant'];
                const csv = [
                    headers.join(','),
                    ...transactions.map(t => [
                        t.date,
                        t.type,
                        t.amount,
                        t.currency,
                        `"${t.category || ''}"`,
                        `"${t.subcategory || ''}"`,
                        `"${(t.description || '').replace(/"/g, '""')}"`,
                        `"${t.merchant || ''}"`
                    ].join(','))
                ].join('\n');

                reply.type('text/csv');
                reply.header('Content-Disposition', 'attachment; filename="transactions.csv"');
                return csv;
            }

            return {
                success: true,
                data: transactions
            };
        } catch (error) {
            fastify.log.error('Failed to export transactions:', error);
            return reply.code(500).send({
                error: 'Failed to export transactions'
            });
        }
    });
}
