import uploadService from '../services/uploadService.js';
import processingService from '../services/processingService.js';
import pool from '../config/database.js';
import { config } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';

export default async function uploadRoutes(fastify, options) {
    // Add authentication to all routes
    fastify.addHook('preHandler', authenticate);
    
    // Upload rate limiting
    await fastify.register(import('@fastify/rate-limit'), {
        max: config.uploadRateLimit,
        timeWindow: '1 hour',
        keyGenerator: (req) => req.user?.id || 'anonymous'
    });

    /**
     * Upload CSV file
     */
    fastify.post('/', async (request, reply) => {
        try {
            // Check if request is multipart
            if (!request.isMultipart()) {
                return reply.code(400).send({
                    error: 'Request must be multipart/form-data'
                });
            }

            // Parse multipart form data
            let fileBuffer = null;
            let fileMetadata = null;
            const userId = request.user.id; // Get from authenticated user
            let accountId = null;
            const parts = request.parts();

            for await (const part of parts) {
                // Log part details for debugging
                console.log('Processing part:', {
                    type: part.type,
                    fieldname: part.fieldname,
                    filename: part.filename || 'N/A'
                });
                
                if (part.type === 'field') {
                    // Handle field parts
                    if (part.fieldname === 'accountId') {
                        accountId = part.value;
                    }
                } else if (part.type === 'file') {
                    // Handle file parts
                    if (part.fieldname === 'file') {
                        // Buffer the file content immediately
                        const chunks = [];
                        for await (const chunk of part.file) {
                            chunks.push(chunk);
                        }
                        fileBuffer = Buffer.concat(chunks);
                        
                        // Store file metadata
                        fileMetadata = {
                            filename: part.filename,
                            mimetype: part.mimetype,
                            encoding: part.encoding,
                            size: fileBuffer.length
                        };
                        
                        console.log(`File buffered: ${fileMetadata.filename}, size: ${fileMetadata.size} bytes`);
                    } else {
                        // Consume and discard any other file streams to prevent hanging
                        for await (const chunk of part.file) {
                            // Just consume it
                        }
                    }
                }
            }
            
            if (!fileBuffer || !fileMetadata) {
                return reply.code(400).send({
                    error: 'No file uploaded'
                });
            }

            if (!userId) {
                return reply.code(400).send({
                    error: 'userId is required'
                });
            }

            // Check file type
            if (!fileMetadata.filename.toLowerCase().endsWith('.csv')) {
                return reply.code(400).send({
                    error: 'Only CSV files are allowed'
                });
            }

            console.log('File metadata:', fileMetadata);
            console.log('userId:', userId);

            // Pass the buffer and metadata to the upload service
            const result = await uploadService.handleUpload(userId, {
                buffer: fileBuffer,
                filename: fileMetadata.filename,
                mimetype: fileMetadata.mimetype,
                encoding: fileMetadata.encoding,
                size: fileMetadata.size
            }, accountId);
            
            // Start processing automatically
            processingService.startProcessing(result.uploadId, userId)
                .catch(error => {
                    fastify.log.error('Background processing failed:', error);
                });

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.log('error', error);
            fastify.log.error('Upload failed:', error);
            return reply.code(500).send({
                error: 'Upload failed',
                message: error.message
            });
        }
    });

    /**
     * Get user uploads
     */
    fastify.get('/', async (request, reply) => {
        const userId = request.user.id;
        const { limit = 20, offset = 0 } = request.query;

        try {
            const uploads = await uploadService.getUserUploads(userId, limit, offset);
            return {
                success: true,
                data: uploads
            };
        } catch (error) {
            fastify.log.error('Failed to get uploads:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve uploads'
            });
        }
    });

    /**
     * Get upload details
     */
    fastify.get('/:uploadId', async (request, reply) => {
        const userId = request.user.id;
        const { uploadId } = request.params;

        try {
            const upload = await uploadService.getUpload(uploadId);
            
            if (!upload) {
                return reply.code(404).send({
                    error: 'Upload not found'
                });
            }

            if (upload.user_id !== userId) {
                return reply.code(403).send({
                    error: 'Access denied'
                });
            }

            return {
                success: true,
                data: upload
            };
        } catch (error) {
            fastify.log.error('Failed to get upload:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve upload'
            });
        }
    });

    /**
     * Resume processing
     */
    fastify.post('/:uploadId/resume', async (request, reply) => {
        const { uploadId } = request.params;
        const { userId } = request.body;

        if (!userId) {
            return reply.code(400).send({
                error: 'userId is required'
            });
        }

        try {
            // Start processing in background
            processingService.startProcessing(uploadId, userId)
                .catch(error => {
                    fastify.log.error('Background processing failed:', error);
                });

            return {
                success: true,
                message: 'Processing resumed'
            };
        } catch (error) {
            return reply.code(500).send({
                error: 'Failed to resume processing',
                message: error.message
            });
        }
    });

    /**
     * Delete upload
     */
    fastify.delete('/:uploadId', async (request, reply) => {
        const userId = request.user.id;
        const { uploadId } = request.params;

        try {
            // Verify ownership
            const upload = await uploadService.getUpload(uploadId);
            
            if (!upload) {
                return reply.code(404).send({
                    error: 'Upload not found'
                });
            }

            if (upload.user_id !== userId) {
                return reply.code(403).send({
                    error: 'Access denied'
                });
            }

            // Delete upload and related data (cascades through foreign keys)
            await pool.query('DELETE FROM wheremymoneygoes.uploads WHERE id = $1', [uploadId]);

            return {
                success: true,
                message: 'Upload deleted successfully'
            };
        } catch (error) {
            fastify.log.error('Failed to delete upload:', error);
            return reply.code(500).send({
                error: 'Failed to delete upload'
            });
        }
    });
}
