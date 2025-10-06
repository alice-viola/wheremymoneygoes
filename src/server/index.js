import { buildApp } from './app.js';
import { config, validateConfig } from './config/env.js';
import { registerRoutes } from './routes/index.js';
import pool from './config/database.js';

async function start() {
    try {
        // Validate configuration
        validateConfig();
        
        // Build Fastify app
        const fastify = await buildApp();
        
        // Test database connection
        await pool.query('SELECT NOW()');
        fastify.log.info('Database connection established');
        
        // Register all routes
        await registerRoutes(fastify);
        
        // Start server
        await fastify.listen({ 
            port: config.port, 
            host: config.host 
        });
        
        fastify.log.info(`Server running at http://${config.host}:${config.port}`);
        
        // Graceful shutdown
        const signals = ['SIGINT', 'SIGTERM'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                fastify.log.info(`Received ${signal}, shutting down gracefully...`);
                try {
                    await fastify.close();
                    await pool.end();
                    process.exit(0);
                } catch (error) {
                    fastify.log.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
start();
