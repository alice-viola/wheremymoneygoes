import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createReadStream } from 'fs';
import { Transform } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import pool, { withTransaction } from '../config/database.js';
import encryptionService from './encryptionService.js';
import websocketService from './websocketService.js';
import { config } from '../config/env.js';

class UploadService {
    constructor() {
        this.uploadDir = config.uploadDir;
        this.ensureUploadDir();
    }

    /**
     * Ensure upload directory exists
     */
    ensureUploadDir() {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * Handle file upload and store lines in database
     * @param {string} userId 
     * @param {object} fileData - Object containing buffer and metadata
     * @param {string} accountId - Account ID to associate with upload
     * @returns {object} Upload information
     */
    async handleUpload(userId, fileData, accountId = null) {
        const uploadId = uuidv4();
        const tempPath = path.join(this.uploadDir, `${uploadId}.csv`);
        let lineCount = 0;
        
        try {
            // Save buffer to file
            await fs.promises.writeFile(tempPath, fileData.buffer);
            
            // Create upload record
            await this.createUploadRecord(userId, uploadId, fileData.filename, accountId);
            
            // Send WebSocket event
            websocketService.sendToUser(userId, 'upload:started', {
                uploadId,
                filename: fileData.filename
            });
            
            // Store lines in database
            lineCount = await this.storeCsvLines(userId, uploadId, tempPath, accountId);
            
            // Update upload record with line count
            await this.updateUploadRecord(uploadId, { total_lines: lineCount });
            
            // Create processing batches
            await this.createProcessingBatches(userId, uploadId, lineCount, accountId);
            
            // Clean up temp file
            fs.unlinkSync(tempPath);
            
            // Send completion event
            websocketService.sendToUser(userId, 'lines:stored', {
                uploadId,
                totalLines: lineCount
            });
            
            return {
                uploadId,
                filename: fileData.filename,
                totalLines: lineCount,
                status: 'ready_for_processing'
            };
            
        } catch (error) {
            // Clean up on error
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            
            // Update upload status
            await this.updateUploadRecord(uploadId, {
                status: 'failed',
                error_message: encryptionService.encryptJSON({ error: error.message })
            });
            
            // Send error event
            websocketService.sendError(userId, uploadId, error.message, true);
            
            throw error;
        }
    }

    /**
     * Create upload record in database
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {string} filename
     * @param {string} accountId 
     */
    async createUploadRecord(userId, uploadId, filename, accountId) {
        const encryptedFilename = encryptionService.encrypt(filename);
        
        // If no accountId provided, get the default account
        if (!accountId) {
            const defaultAccountQuery = `
                SELECT id FROM wheremymoneygoes.accounts 
                WHERE user_id = $1 AND is_default = true
                LIMIT 1
            `;
            const accountResult = await pool.query(defaultAccountQuery, [userId]);
            if (accountResult.rows.length > 0) {
                accountId = accountResult.rows[0].id;
            }
        }
        
        const query = `
            INSERT INTO wheremymoneygoes.uploads (id, user_id, account_id, filename, original_filename, status, created_at)
            VALUES ($1, $2, $3, $4, $5, 'uploading', NOW())
        `;
        
        await pool.query(query, [
            uploadId,
            userId,
            accountId,
            JSON.stringify(encryptedFilename),
            JSON.stringify(encryptedFilename)
        ]);
    }

    /**
     * Update upload record
     * @param {string} uploadId 
     * @param {object} updates 
     */
    async updateUploadRecord(uploadId, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;
        
        Object.entries(updates).forEach(([key, value]) => {
            fields.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        });
        
        fields.push('updated_at = NOW()');
        values.push(uploadId);
        
        const query = `
            UPDATE wheremymoneygoes.uploads 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
        `;
        
        await pool.query(query, values);
    }

    /**
     * Store CSV lines in database
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {string} filePath
     * @param {string} accountId 
     * @returns {number} Number of lines stored
     */
    async storeCsvLines(userId, uploadId, filePath, accountId) {
        return new Promise((resolve, reject) => {
            let lineNumber = 0;
            const batchSize = 100;
            let batch = [];
            
            const lineStream = new Transform({
                transform(chunk, encoding, callback) {
                    callback(null, chunk);
                }
            });
            
            const fileStream = createReadStream(filePath, { encoding: 'utf8' });
            let buffer = '';
            
            fileStream.on('data', async (chunk) => {
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line in buffer
                
                for (const line of lines) {
                    if (line.trim()) {
                        const encryptedLine = encryptionService.encrypt(line);
                        batch.push([
                            uuidv4(),
                            userId,
                            uploadId,
                            accountId,
                            lineNumber++,
                            JSON.stringify(encryptedLine),
                            false
                        ]);
                        
                        if (batch.length >= batchSize) {
                            fileStream.pause();
                            await this.insertLineBatch(batch);
                            batch = [];
                            
                            // Send progress update
                            if (lineNumber % 500 === 0) {
                                websocketService.sendToUser(userId, 'lines:progress', {
                                    uploadId,
                                    stored: lineNumber
                                });
                            }
                            
                            fileStream.resume();
                        }
                    }
                }
            });
            
            fileStream.on('end', async () => {
                try {
                    // Process remaining buffer
                    if (buffer.trim()) {
                        const encryptedLine = encryptionService.encrypt(buffer);
                        batch.push([
                            uuidv4(),
                            userId,
                            uploadId,
                            lineNumber++,
                            JSON.stringify(encryptedLine),
                            false
                        ]);
                    }
                    
                    // Insert remaining batch
                    if (batch.length > 0) {
                        await this.insertLineBatch(batch);
                    }
                    
                    resolve(lineNumber);
                } catch (error) {
                    reject(error);
                }
            });
            
            fileStream.on('error', reject);
        });
    }

    /**
     * Insert batch of lines into database
     * @param {Array} batch 
     */
    async insertLineBatch(batch) {
        if (batch.length === 0) return;
        
        const values = batch.flat();
        const placeholders = batch.map((_, i) => {
            const base = i * 7;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
        }).join(', ');
        
        const query = `
            INSERT INTO wheremymoneygoes.raw_csv_lines (id, user_id, upload_id, account_id, line_number, raw_data, processed)
            VALUES ${placeholders}
            ON CONFLICT (id) DO NOTHING
        `;
        
        try {
            await pool.query(query, values);
        } catch (error) {
            console.error('Error inserting batch:', error.message);
            // Log the first ID that might be causing issues
            if (batch.length > 0) {
                console.error('First ID in batch:', batch[0][0]);
            }
            throw error;
        }
    }

    /**
     * Create processing batches
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {number} totalLines
     * @param {string} accountId 
     */
    async createProcessingBatches(userId, uploadId, totalLines, accountId) {
        const batchSize = config.processingBatchSize;
        const batches = [];
        
        for (let i = 0; i < totalLines; i += batchSize) {
            const batchEnd = Math.min(i + batchSize - 1, totalLines - 1);
            batches.push([
                uuidv4(),
                userId,
                uploadId,
                accountId,
                i,
                batchEnd,
                'pending'
            ]);
        }
        
        if (batches.length > 0) {
            const placeholders = batches.map((_, i) => {
                const base = i * 7;
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
            }).join(', ');
            
            const query = `
                INSERT INTO wheremymoneygoes.processing_queue (id, user_id, upload_id, account_id, batch_start, batch_end, status)
                VALUES ${placeholders}
                ON CONFLICT (id) DO NOTHING
            `;
            
            await pool.query(query, batches.flat());
        }
    }

    /**
     * Get upload by ID
     * @param {string} uploadId 
     * @returns {object} Upload record
     */
    async getUpload(uploadId) {
        const query = `
            SELECT 
                id,
                user_id,
                filename,
                status,
                total_lines,
                processed_lines,
                failed_lines,
                created_at,
                updated_at
            FROM wheremymoneygoes.uploads
            WHERE id = $1
        `;
        
        const result = await pool.query(query, [uploadId]);
        if (result.rows.length === 0) {
            return null;
        }
        
        const upload = result.rows[0];
        
        // Decrypt filename
        if (upload.filename) {
            try {
                upload.filename = encryptionService.decrypt(JSON.parse(upload.filename));
            } catch (error) {
                upload.filename = 'Unknown';
            }
        }
        
        return upload;
    }

    /**
     * Get user uploads
     * @param {string} userId 
     * @param {number} limit 
     * @param {number} offset 
     * @returns {Array} List of uploads
     */
    async getUserUploads(userId, limit = 20, offset = 0) {
        const query = `
            SELECT 
                id,
                filename,
                status,
                total_lines,
                processed_lines,
                failed_lines,
                created_at,
                updated_at,
                completed_at
            FROM wheremymoneygoes.uploads
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await pool.query(query, [userId, limit, offset]);
        
        // Decrypt filenames
        return result.rows.map(upload => {
            if (upload.filename) {
                try {
                    upload.filename = encryptionService.decrypt(JSON.parse(upload.filename));
                } catch (error) {
                    upload.filename = 'Unknown';
                }
            }
            return upload;
        });
    }
}

// Export singleton instance
export default new UploadService();
