import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import pool, { withTransaction } from '../config/database.js';
import encryptionService from './encryptionService.js';
import websocketService from './websocketService.js';
import { config } from '../config/env.js';
import {
    transformCSVRows,
    categorizeTransactions
} from '../parser.js';
import { executeAgent, createCSVParser, createFinancialFieldMapper, transformAllRows, categorizeExpenses } from '../agents.js';

class ProcessingService {
    constructor() {
        this.processingStatus = new Map(); // uploadId -> processing status
    }

    /**
     * Start processing an upload
     * @param {string} uploadId 
     * @param {string} userId 
     */
    async startProcessing(uploadId, userId) {
        if (this.processingStatus.has(uploadId)) {
            throw new Error('Processing already in progress for this upload');
        }

        this.processingStatus.set(uploadId, {
            status: 'processing',
            startTime: Date.now()
        });

        try {
            // Update upload status
            await this.updateUploadStatus(uploadId, 'processing');
            
            // Send WebSocket notification
            websocketService.sendToUser(userId, 'processing:started', { uploadId });

            // Process in steps
            await this.processUpload(uploadId, userId);
            
            // Mark as completed
            await this.updateUploadStatus(uploadId, 'completed', { completed_at: new Date() });
            
            // Get statistics
            const stats = await this.getUploadStatistics(uploadId, userId);
            
            // Send completion notification
            websocketService.sendProcessingComplete(userId, uploadId, stats);
            
        } catch (error) {
            console.error(`Processing failed for upload ${uploadId}:`, error);
            
            // Update status
            await this.updateUploadStatus(uploadId, 'failed', {
                error_message: encryptionService.encryptJSON({ error: error.message })
            });
            
            // Send error notification
            websocketService.sendError(userId, uploadId, error.message, true);
            
            throw error;
        } finally {
            this.processingStatus.delete(uploadId);
        }
    }

    /**
     * Process upload through all stages
     * @param {string} uploadId 
     * @param {string} userId 
     */
    async processUpload(uploadId, userId) {
        // Step 1: Detect separator
        const separator = await this.detectSeparator(uploadId, userId);
        
        // Step 2: Detect field mappings
        const fieldMappings = await this.detectMappings(uploadId, userId, separator);
        
        // Step 3: Process batches
        await this.processBatches(uploadId, userId, separator, fieldMappings);
    }

    /**
     * Detect CSV separator
     * @param {string} uploadId 
     * @param {string} userId 
     */
    async detectSeparator(uploadId, userId) {
        websocketService.sendToUser(userId, 'processing:phase', {
            uploadId,
            phase: 'detecting_separator'
        });

        // Get first few lines
        const lines = await this.getUnprocessedLines(uploadId, 5);
        if (lines.length === 0) {
            throw new Error('No lines to process');
        }

        // Decrypt lines
        const decryptedLines = lines.map(line => 
            encryptionService.decrypt(JSON.parse(line.raw_data))
        ).join('\n');

        // Detect separator using the agent
        const separatorResult = await executeAgent(createCSVParser, {}, decryptedLines);
        
        // Store in upload record
        await this.updateUploadStatus(uploadId, null, {
            separator: separatorResult.separator
        });

        websocketService.sendToUser(userId, 'separator:detected', {
            uploadId,
            separator: separatorResult.separator,
            confidence: separatorResult.confidence
        });

        return separatorResult.separator;
    }

    /**
     * Detect field mappings
     * @param {string} uploadId 
     * @param {string} userId 
     * @param {string} separator 
     */
    async detectMappings(uploadId, userId, separator) {
        websocketService.sendToUser(userId, 'processing:phase', {
            uploadId,
            phase: 'detecting_mappings'
        });

        // Get first data line (skip header if exists)
        const lines = await this.getUnprocessedLines(uploadId, 2);
        
        // Parse lines with separator
        const parsedRows = [];
        for (const line of lines) {
            const decrypted = encryptionService.decrypt(JSON.parse(line.raw_data));
            const fields = decrypted.split(separator).map(f => f.trim());
            parsedRows.push(fields);
        }

        // Create object format for field mapping
        const headers = parsedRows[0];
        const dataRow = parsedRows[1] || parsedRows[0];
        const rowObject = {};
        headers.forEach((header, index) => {
            rowObject[header] = dataRow[index];
        });

        // Detect field mappings using the agent
        const mappings = await executeAgent(
            createFinancialFieldMapper, 
            {}, 
            JSON.stringify({ headers: headers, row: rowObject }, null, 2)
        );
        
        // Store encrypted mappings
        await this.updateUploadStatus(uploadId, null, {
            field_mappings: encryptionService.encryptJSON(mappings)
        });

        websocketService.sendToUser(userId, 'mapping:detected', {
            uploadId,
            fieldCount: Object.keys(mappings.mappings).length
        });

        return mappings;
    }

    /**
     * Process batches of CSV lines
     * @param {string} uploadId 
     * @param {string} userId 
     * @param {string} separator 
     * @param {object} fieldMappings 
     */
    async processBatches(uploadId, userId, separator, fieldMappings) {
        const batchSize = config.processingBatchSize;
        let processedCount = 0;
        let failedCount = 0;

        // Get total line count
        const totalLines = await this.getTotalLines(uploadId);

        while (true) {
            // Get next batch of unprocessed lines
            const lines = await this.getUnprocessedLines(uploadId, batchSize);
            if (lines.length === 0) break;

            websocketService.sendToUser(userId, 'batch:processing', {
                uploadId,
                batchStart: processedCount,
                batchEnd: processedCount + lines.length
            });

            try {
                // Process batch
                const { processed, failed } = await this.processBatch(
                    lines,
                    userId,
                    uploadId,
                    separator,
                    fieldMappings
                );

                processedCount += processed;
                failedCount += failed;

                // Update upload progress
                await this.updateUploadStatus(uploadId, null, {
                    processed_lines: processedCount,
                    failed_lines: failedCount
                });

                // Send progress update
                websocketService.sendUploadProgress(userId, uploadId, 'processing', {
                    processed: processedCount,
                    total: totalLines,
                    failed: failedCount
                });

            } catch (error) {
                console.error(`Batch processing error:`, error);
                failedCount += lines.length;
            }
        }
    }

    /**
     * Process a single batch
     * @param {Array} lines 
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {string} separator 
     * @param {object} fieldMappings 
     */
    async processBatch(lines, userId, uploadId, separator, fieldMappings) {
        let processed = 0;
        let failed = 0;

        // Parse CSV lines
        const parsedRows = [];
        const lineIds = [];

        for (const line of lines) {
            try {
                const decrypted = encryptionService.decrypt(JSON.parse(line.raw_data));
                const fields = decrypted.split(separator).map(f => f.trim());
                
                // Skip header line
                if (line.line_number === 0) {
                    lineIds.push(line.id);
                    continue;
                }

                // Create row object
                const headers = await this.getHeaders(uploadId, separator);
                const rowObject = {};
                headers.forEach((header, index) => {
                    rowObject[header] = fields[index] || '';
                });

                parsedRows.push(rowObject);
                lineIds.push(line.id);
            } catch (error) {
                console.error(`Error parsing line ${line.line_number}:`, error);
                failed++;
                await this.markLineFailed(line.id, error.message);
            }
        }

        if (parsedRows.length === 0) {
            return { processed: lines.length - failed, failed };
        }

        // Transform rows
        const transformedRows = transformAllRows(parsedRows, fieldMappings);

        // Categorize transactions
        const merchantCache = await this.getUserMerchantCache(userId);
        const categorizationResult = await categorizeExpenses(transformedRows, {
            batchSize: 50,
            parallelBatches: 5,
            merchantCache
        });

        // Save transactions to database
        await this.saveTransactions(
            categorizationResult.transactions,
            userId,
            uploadId,
            lineIds
        );

        // Update merchant cache
        await this.updateUserMerchantCache(userId, categorizationResult.merchantCache);

        // Mark lines as processed
        await this.markLinesProcessed(lineIds);

        processed = lineIds.length;

        return { processed, failed };
    }

    /**
     * Compute a hash for a transaction to detect duplicates
     * @param {Object} tx - Transaction object
     * @param {string} userId - User ID
     * @returns {string} SHA256 hash
     */
    computeTransactionHash(tx, userId) {
        // Create a unique string from transaction fields that identify it uniquely
        // We use: userId, date, amount, currency, kind, and description
        const hashInput = [
            userId,
            tx.Date,
            tx.Amount.toString(),
            tx.Currency,
            tx.Kind,
            tx.Description // Original description before encryption
        ].join('|');
        
        return crypto.createHash('sha256').update(hashInput).digest('hex');
    }

    /**
     * Save transactions to database
     * @param {Array} transactions 
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {Array} lineIds 
     */
    async saveTransactions(transactions, userId, uploadId, lineIds) {
        if (!transactions || transactions.length === 0) {
            console.warn('No transactions to save');
            return;
        }

        let inserted = 0;
        let skipped = 0;
        let balanceEntriesFiltered = 0;

        for (let index = 0; index < transactions.length; index++) {
            const tx = transactions[index];
            
            // Filter out Balance entries - these are account snapshots, not transactions
            if (tx.category === 'Balance') {
                balanceEntriesFiltered++;
                console.log(`Filtered out Balance entry: ${tx.Description} - Amount: ${tx.Amount}`);
                continue;
            }
            
            // Compute transaction hash for duplicate detection
            const transactionHash = this.computeTransactionHash(tx, userId);
            
            // Prepare encrypted data
            const encryptedData = encryptionService.encryptJSON({
                description: tx.Description,
                code: tx.Code,
                subcategory: tx.subcategory,
                merchant_name: tx.merchantName,
                merchant_type: tx.merchantType
            });

            // Parse date to extract month and year
            const transactionDate = new Date(tx.Date);
            const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
            const transactionYear = transactionDate.getFullYear();

            try {
                // Use INSERT ... ON CONFLICT to handle duplicates
                const query = `
                    INSERT INTO wheremymoneygoes.transactions (
                        id, user_id, upload_id, raw_line_id, transaction_date,
                        transaction_month, transaction_year, kind, amount, currency, 
                        category, encrypted_data, confidence, transaction_hash
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (user_id, transaction_hash) DO NOTHING
                    RETURNING id
                `;

                const result = await pool.query(query, [
                    uuidv4(),
                    userId,
                    uploadId,
                    lineIds[index] || null,
                    tx.Date,
                    transactionMonth,
                    transactionYear,
                    tx.Kind,
                    tx.Amount,
                    tx.Currency,
                    tx.category,
                    JSON.stringify(encryptedData),
                    tx.confidence || 0,
                    transactionHash
                ]);

                if (result.rowCount > 0) {
                    inserted++;
                } else {
                    skipped++;
                }
            } catch (error) {
                console.error(`Error saving transaction ${index}:`, error);
                // Continue with next transaction
            }
        }

        console.log(`Transactions processed: ${inserted} inserted, ${skipped} skipped as duplicates, ${balanceEntriesFiltered} Balance entries filtered`);
        
        // Send progress update
        if (websocketService) {
            websocketService.sendToUser(userId, {
                type: 'processing_info',
                uploadId,
                message: `Saved ${inserted} new transactions, skipped ${skipped} duplicates, filtered ${balanceEntriesFiltered} Balance entries`
            });
        }
    }

    /**
     * Get unprocessed lines
     * @param {string} uploadId 
     * @param {number} limit 
     */
    async getUnprocessedLines(uploadId, limit) {
        const query = `
            SELECT id, line_number, raw_data
            FROM wheremymoneygoes.raw_csv_lines
            WHERE upload_id = $1 AND processed = false
            ORDER BY line_number
            LIMIT $2
        `;

        const result = await pool.query(query, [uploadId, limit]);
        return result.rows;
    }

    /**
     * Get headers from first line
     * @param {string} uploadId 
     * @param {string} separator 
     */
    async getHeaders(uploadId, separator) {
        const query = `
            SELECT raw_data
            FROM wheremymoneygoes.raw_csv_lines
            WHERE upload_id = $1 AND line_number = 0
            LIMIT 1
        `;

        const result = await pool.query(query, [uploadId]);
        if (result.rows.length === 0) {
            return [];
        }

        const decrypted = encryptionService.decrypt(JSON.parse(result.rows[0].raw_data));
        return decrypted.split(separator).map(h => h.trim());
    }

    /**
     * Get total line count
     * @param {string} uploadId 
     */
    async getTotalLines(uploadId) {
        const query = `
            SELECT COUNT(*) as count
            FROM wheremymoneygoes.raw_csv_lines
            WHERE upload_id = $1
        `;

        const result = await pool.query(query, [uploadId]);
        return parseInt(result.rows[0].count);
    }

    /**
     * Mark lines as processed
     * @param {Array} lineIds 
     */
    async markLinesProcessed(lineIds) {
        if (lineIds.length === 0) return;

        const query = `
            UPDATE wheremymoneygoes.raw_csv_lines
            SET processed = true
            WHERE id = ANY($1)
        `;

        await pool.query(query, [lineIds]);
    }

    /**
     * Mark line as failed
     * @param {string} lineId 
     * @param {string} error 
     */
    async markLineFailed(lineId, error) {
        const encryptedError = encryptionService.encrypt(error);

        const query = `
            UPDATE wheremymoneygoes.raw_csv_lines
            SET processing_error = $1
            WHERE id = $2
        `;

        await pool.query(query, [JSON.stringify(encryptedError), lineId]);
    }

    /**
     * Update upload status
     * @param {string} uploadId 
     * @param {string} status 
     * @param {object} additionalFields 
     */
    async updateUploadStatus(uploadId, status, additionalFields = {}) {
        const fields = status ? { status, ...additionalFields } : additionalFields;
        const updates = [];
        const values = [];
        let paramCount = 1;

        Object.entries(fields).forEach(([key, value]) => {
            updates.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        });

        updates.push('updated_at = NOW()');
        values.push(uploadId);

        const query = `
            UPDATE wheremymoneygoes.uploads
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
        `;

        await pool.query(query, values);
    }

    /**
     * Get user merchant cache
     * @param {string} userId 
     */
    async getUserMerchantCache(userId) {
        const query = `
            SELECT merchant_key, category, encrypted_data, confidence
            FROM wheremymoneygoes.merchant_cache
            WHERE user_id = $1
        `;

        const result = await pool.query(query, [userId]);
        const cache = new Map();

        for (const row of result.rows) {
            try {
                // merchant_key is TEXT column with JSON string, encrypted_data is JSONB (already parsed)
                const merchantKeyData = typeof row.merchant_key === 'string' ? JSON.parse(row.merchant_key) : row.merchant_key;
                const decryptedKey = encryptionService.decrypt(merchantKeyData);
                const decryptedData = encryptionService.decryptJSON(row.encrypted_data);
                
                cache.set(decryptedKey, {
                    category: row.category,
                    subcategory: decryptedData.subcategory,
                    merchantName: decryptedData.merchant_name,
                    merchantType: decryptedData.merchant_type,
                    confidence: row.confidence
                });
            } catch (error) {
                console.warn('Failed to decrypt merchant cache entry:', error.message);
                // Skip this entry if decryption fails
            }
        }

        return cache;
    }

    /**
     * Update user merchant cache
     * @param {string} userId 
     * @param {Map} merchantCache 
     */
    async updateUserMerchantCache(userId, merchantCache) {
        if (!merchantCache || merchantCache.size === 0) return;

        for (const [key, data] of merchantCache) {
            const encryptedKey = encryptionService.encrypt(key);
            const encryptedData = encryptionService.encryptJSON({
                subcategory: data.subcategory,
                merchant_name: data.merchantName,
                merchant_type: data.merchantType
            });

            const query = `
                INSERT INTO wheremymoneygoes.merchant_cache (
                    id, user_id, merchant_key, category, encrypted_data, 
                    confidence, usage_count, last_used
                )
                VALUES ($1, $2, $3, $4, $5, $6, 1, NOW())
                ON CONFLICT (user_id, merchant_key) 
                DO UPDATE SET
                    category = EXCLUDED.category,
                    encrypted_data = EXCLUDED.encrypted_data,
                    confidence = EXCLUDED.confidence,
                    usage_count = merchant_cache.usage_count + 1,
                    last_used = NOW(),
                    updated_at = NOW()
            `;

            await pool.query(query, [
                uuidv4(),
                userId,
                JSON.stringify(encryptedKey),
                data.category,
                JSON.stringify(encryptedData),
                data.confidence
            ]);
        }
    }

    /**
     * Get upload statistics
     * @param {string} uploadId 
     * @param {string} userId 
     */
    async getUploadStatistics(uploadId, userId) {
        const query = `
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN kind = '-' THEN amount ELSE 0 END) as total_spent,
                SUM(CASE WHEN kind = '+' THEN amount ELSE 0 END) as total_income,
                COUNT(DISTINCT category) as unique_categories,
                AVG(confidence) as avg_confidence
            FROM wheremymoneygoes.transactions
            WHERE upload_id = $1 AND user_id = $2
        `;

        const result = await pool.query(query, [uploadId, userId]);
        return result.rows[0];
    }
}

// Export singleton instance
export default new ProcessingService();
