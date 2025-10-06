import authRoutes from './auth.js';
import uploadRoutes from './uploads.js';
import transactionRoutes from './transactions.js';
import analyticsRoutes from './analytics.js';
import websocketRoutes from './websocket.js';
import accountRoutes from './accounts.js';
import assistantRoutes from './assistant.js';

/**
 * Register all routes
 * @param {FastifyInstance} fastify 
 */
export async function registerRoutes(fastify) {
    // Authentication routes (no auth required)
    await fastify.register(authRoutes);
    
    // API routes (auth required)
    await fastify.register(accountRoutes, { prefix: '/api/accounts' });
    await fastify.register(uploadRoutes, { prefix: '/api/uploads' });
    await fastify.register(transactionRoutes, { prefix: '/api/transactions' });
    await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
    await fastify.register(assistantRoutes, { prefix: '/api/assistant' });
    
    // WebSocket route
    await fastify.register(websocketRoutes, { prefix: '/ws' });
    
    // API documentation route
    fastify.get('/api', async (request, reply) => {
        return {
            name: 'WhereMyMoneyGoes API',
            version: '1.0.0',
            endpoints: {
                auth: {
                    signup: 'POST /api/auth/signup',
                    login: 'POST /api/auth/login',
                    verify: 'GET /api/auth/verify',
                    logout: 'POST /api/auth/logout'
                },
                accounts: '/api/accounts',
                uploads: '/api/uploads',
                transactions: '/api/transactions',
                analytics: '/api/analytics',
                assistant: '/api/assistant',
                websocket: '/ws'
            }
        };
    });
}
