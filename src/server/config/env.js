import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // Database
    pgUser: process.env.PG_USER || 'postgres',
    pgHost: process.env.PG_HOST || 'localhost',
    pgDatabase: process.env.PG_DATABASE || 'wheremymoneygoes',
    pgPassword: process.env.PG_PASSWORD || 'postgres',
    pgPort: parseInt(process.env.PG_PORT || '5432'),
    pgUseSSL: process.env.PG_USE_SSL === 'true',
    dbPoolMin: parseInt(process.env.DB_POOL_MIN || '2'),
    dbPoolMax: parseInt(process.env.DB_POOL_MAX || '10'),
    
    // Encryption
    encryptionKey: process.env.ENCRYPTION_KEY,
    encryptionSalt: process.env.ENCRYPTION_SALT,
    
    // Authentication
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    
    // Rate Limits
    uploadRateLimit: parseInt(process.env.UPLOAD_RATE_LIMIT || '10'),
    processingRateLimit: parseInt(process.env.PROCESSING_RATE_LIMIT || '100'),
    aiRateLimit: parseInt(process.env.AI_RATE_LIMIT || '5000'),
    wsRateLimit: parseInt(process.env.WS_RATE_LIMIT || '5'),
    
    // Processing
    processingBatchSize: parseInt(process.env.PROCESSING_BATCH_SIZE || '50'),
    maxParallelBatches: parseInt(process.env.MAX_PARALLEL_BATCHES || '10'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    
    // File Upload
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
    maxLinesPerFile: parseInt(process.env.MAX_LINES_PER_FILE || '1000000'),
    
    // AI Services
    openaiApiKey: process.env.OPENAI_API_KEY,
    gptModel: process.env.GPT_MODEL || 'gpt-4.1-mini-2025-04-14',
    
    // WebSocket
    wsHeartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000'),
    wsReconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL || '5000'),
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    
    // Development
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
};

// Validate required configuration
export function validateConfig() {
    const required = ['pgUser', 'pgHost', 'pgDatabase'];
    const missing = [];
    
    for (const key of required) {
        if (!config[key]) {
            missing.push(key);
        }
    }
    
    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
}
