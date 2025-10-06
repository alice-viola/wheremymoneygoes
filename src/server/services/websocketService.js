import { config } from '../config/env.js';

class WebSocketService {
    constructor() {
        this.connections = new Map(); // userId -> Set of connections
        this.heartbeatInterval = null;
    }

    /**
     * Initialize WebSocket service
     * @param {FastifyInstance} fastify 
     */
    initialize(fastify) {
        this.fastify = fastify;
        this.startHeartbeat();
    }

    /**
     * Add a new WebSocket connection
     * @param {string} userId 
     * @param {WebSocket} connection 
     */
    addConnection(userId, connection) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        this.connections.get(userId).add(connection);
        
        // Setup connection handlers
        connection.on('close', () => {
            this.removeConnection(userId, connection);
        });
        
        connection.on('error', (error) => {
            this.fastify?.log.error(`WebSocket error for user ${userId}:`, error);
            this.removeConnection(userId, connection);
        });
        
        connection.on('pong', () => {
            connection.isAlive = true;
        });
        
        // Send initial connection success
        this.sendToConnection(connection, {
            type: 'connected',
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Remove a WebSocket connection
     * @param {string} userId 
     * @param {WebSocket} connection 
     */
    removeConnection(userId, connection) {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            userConnections.delete(connection);
            if (userConnections.size === 0) {
                this.connections.delete(userId);
            }
        }
    }

    /**
     * Send message to specific connection
     * @param {WebSocket} connection 
     * @param {object} data 
     */
    sendToConnection(connection, data) {
        if (connection.readyState === 1) { // WebSocket.OPEN
            try {
                connection.send(JSON.stringify(data));
            } catch (error) {
                this.fastify?.log.error('Failed to send WebSocket message:', error);
            }
        }
    }

    /**
     * Send message to all connections of a user
     * @param {string} userId 
     * @param {string} event 
     * @param {object} data 
     */
    sendToUser(userId, event, data) {
        const userConnections = this.connections.get(userId);
        if (userConnections) {
            const message = {
                type: event,
                data,
                timestamp: new Date().toISOString()
            };
            
            userConnections.forEach(connection => {
                this.sendToConnection(connection, message);
            });
        }
    }

    /**
     * Broadcast to all connected users
     * @param {string} event 
     * @param {object} data 
     */
    broadcast(event, data) {
        const message = {
            type: event,
            data,
            timestamp: new Date().toISOString()
        };
        
        this.connections.forEach((userConnections, userId) => {
            userConnections.forEach(connection => {
                this.sendToConnection(connection, message);
            });
        });
    }

    /**
     * Send upload progress event
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {string} phase 
     * @param {object} progress 
     */
    sendUploadProgress(userId, uploadId, phase, progress) {
        this.sendToUser(userId, 'upload:progress', {
            uploadId,
            phase,
            ...progress
        });
    }

    /**
     * Send categorization progress
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {number} processed 
     * @param {number} total 
     */
    sendCategorizationProgress(userId, uploadId, processed, total) {
        this.sendToUser(userId, 'categorize:progress', {
            uploadId,
            processed,
            total,
            percentage: Math.round((processed / total) * 100)
        });
    }

    /**
     * Send processing complete event
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {object} statistics 
     */
    sendProcessingComplete(userId, uploadId, statistics) {
        this.sendToUser(userId, 'upload:completed', {
            uploadId,
            statistics,
            completedAt: new Date().toISOString()
        });
    }

    /**
     * Send error event
     * @param {string} userId 
     * @param {string} uploadId 
     * @param {string} error 
     * @param {boolean} canRetry 
     */
    sendError(userId, uploadId, error, canRetry = false) {
        this.sendToUser(userId, 'upload:failed', {
            uploadId,
            error,
            canRetry
        });
    }

    /**
     * Start heartbeat to keep connections alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.connections.forEach((userConnections, userId) => {
                userConnections.forEach(connection => {
                    if (connection.isAlive === false) {
                        connection.terminate();
                        this.removeConnection(userId, connection);
                        return;
                    }
                    
                    connection.isAlive = false;
                    connection.ping();
                });
            });
        }, config.wsHeartbeatInterval);
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Get connection count
     * @returns {object} Connection statistics
     */
    getStats() {
        let totalConnections = 0;
        this.connections.forEach(userConnections => {
            totalConnections += userConnections.size;
        });
        
        return {
            users: this.connections.size,
            connections: totalConnections
        };
    }
}

// Export singleton instance
export default new WebSocketService();
