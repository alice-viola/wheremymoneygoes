import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from './config/env.js';

/**
 * Build Fastify application
 */
export async function buildApp(opts = {}) {
    const fastify = Fastify({
        logger: {
            level: config.logLevel,
            ...(config.isDevelopment && {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname'
                    }
                }
            })
        },
        bodyLimit: config.maxFileSize, // Set body limit to match max file size
        connectionTimeout: 120000, // 2 minutes for connection timeout
        requestTimeout: 300000, // 5 minutes for request timeout (for large file uploads)
        ...opts
    });

    // Register plugins
    await fastify.register(cors, {
        origin: config.isDevelopment ? true : process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
    });

    await fastify.register(helmet, {
        contentSecurityPolicy: false // Will configure properly for production
    });

    await fastify.register(multipart, {
        limits: {
            fileSize: config.maxFileSize,
            files: 1, // Only one file at a time
            fieldSize: 100 * 1024, // 100KB for field values
            parts: 10, // Max number of parts (fields + files)
            headerPairs: 2000 // Max header key-value pairs
        },
        attachFieldsToBody: false // Don't attach to body to avoid memory issues
    });

    await fastify.register(websocket, {
        options: {
            maxPayload: 1048576 // 1MB
        }
    });

    // Global rate limiting
    await fastify.register(rateLimit, {
        max: 1000,
        timeWindow: '1 minute',
        cache: 10000,
        allowList: config.isDevelopment ? ['127.0.0.1', '::1'] : [],
        redis: null // Use in-memory store for now
    });

    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
        fastify.log.error(error);
        
        // Don't expose internal errors in production
        if (config.isProduction && error.statusCode === 500) {
            reply.status(500).send({
                error: 'Internal Server Error',
                message: 'An unexpected error occurred'
            });
        } else {
            reply.status(error.statusCode || 500).send({
                error: error.name || 'Error',
                message: error.message,
                ...(config.isDevelopment && { stack: error.stack })
            });
        }
    });

    // Health check
    fastify.get('/health', async (request, reply) => {
        return { 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    });

    return fastify;
}
