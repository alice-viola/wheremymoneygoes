import websocketService from '../services/websocketService.js';
import { config } from '../config/env.js';

export default async function websocketRoutes(fastify, options) {
    // Initialize WebSocket service
    websocketService.initialize(fastify);

    // WebSocket endpoint
    fastify.get('/', { websocket: true }, (connection, req) => {
        const { socket } = connection;
        const userId = req.query.userId;

        if (!userId) {
            socket.send(JSON.stringify({
                type: 'error',
                message: 'userId is required'
            }));
            socket.close();
            return;
        }

        fastify.log.info(`WebSocket connection established for user: ${userId}`);

        // Add connection to service
        websocketService.addConnection(userId, socket);

        // Handle incoming messages
        socket.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                
                // Handle different message types
                switch (data.type) {
                    case 'ping':
                        socket.send(JSON.stringify({
                            type: 'pong',
                            timestamp: new Date().toISOString()
                        }));
                        break;
                    
                    case 'subscribe':
                        // Handle subscription to specific events
                        fastify.log.info(`User ${userId} subscribed to: ${data.event}`);
                        break;
                    
                    default:
                        socket.send(JSON.stringify({
                            type: 'error',
                            message: `Unknown message type: ${data.type}`
                        }));
                }
            } catch (error) {
                fastify.log.error('WebSocket message error:', error);
                socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format'
                }));
            }
        });

        // Handle connection close
        socket.on('close', () => {
            fastify.log.info(`WebSocket connection closed for user: ${userId}`);
        });

        // Handle errors
        socket.on('error', (error) => {
            fastify.log.error(`WebSocket error for user ${userId}:`, error);
        });
    });

    // WebSocket stats endpoint (HTTP)
    fastify.get('/stats', async (request, reply) => {
        const stats = websocketService.getStats();
        return {
            success: true,
            data: stats
        };
    });
}
