# WhereMyMoneyGoes - Backend Implementation Plan (Revised)

## 🎯 Project Overview

Build a Fastify-based backend service that processes financial CSV files progressively, categorizes transactions using AI, stores encrypted data, and provides real-time updates via WebSockets.

## 📋 Key Requirements

### Core Features
1. **No Authentication Initially**: Add user_id manually for now
2. **Progressive Processing**: Store raw CSV lines, process incrementally
3. **Data Encryption**: Encrypt sensitive financial data
4. **Per-User Merchant Cache**: Isolated learning per user
5. **Configurable Rate Limits**: Prevent abuse
6. **Real-time Updates**: WebSocket events for progress
7. **Vue 3 Frontend**: (Later phase)

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│                 │     │                  │     │              │
│  Vue 3 Frontend │────▶│  Fastify Server  │────▶│  PostgreSQL  │
│     (Later)     │◀────│                  │◀────│  (Encrypted) │
└─────────────────┘     └──────────────────┘     └──────────────┘
         ▲                       │                        
         │                       ▼                        
         └───── WebSocket ───────┘                        
              (Progress Events)                           
```

## 📊 Database Schema (With Encryption)

### Users Table (Simplified - No Auth)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL, -- temporary identifier
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test users
INSERT INTO users (username) VALUES ('test_user_1'), ('test_user_2');
```

### Raw CSV Lines Table (Staging)
```sql
CREATE TABLE raw_csv_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    upload_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    raw_data TEXT NOT NULL, -- ENCRYPTED: Original CSV line
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT, -- ENCRYPTED: Error details if any
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for querying
    INDEX idx_upload_unprocessed (upload_id, processed),
    INDEX idx_user_upload (user_id, upload_id),
    UNIQUE KEY unique_upload_line (upload_id, line_number)
);
```

### Uploads Table
```sql
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL, -- ENCRYPTED
    original_filename VARCHAR(255), -- ENCRYPTED
    file_size INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, partial
    separator VARCHAR(5),
    field_mappings JSONB, -- ENCRYPTED: Store detected mappings
    total_lines INTEGER,
    processed_lines INTEGER DEFAULT 0,
    failed_lines INTEGER DEFAULT 0,
    error_message TEXT, -- ENCRYPTED
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Queryable indexes
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_date (user_id, created_at)
);
```

### Transactions Table (With Encryption)
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    raw_line_id UUID REFERENCES raw_csv_lines(id) ON DELETE CASCADE,
    
    -- Queryable fields (NOT encrypted)
    transaction_date DATE NOT NULL,
    transaction_month VARCHAR(7) GENERATED ALWAYS AS (TO_CHAR(transaction_date, 'YYYY-MM')) STORED,
    transaction_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM transaction_date)) STORED,
    kind VARCHAR(1) NOT NULL, -- '+' or '-'
    amount DECIMAL(10, 2) NOT NULL, -- Keep unencrypted for analytics
    currency VARCHAR(3) NOT NULL,
    category VARCHAR(100), -- Keep unencrypted for queries
    
    -- Encrypted sensitive data
    encrypted_data JSONB NOT NULL, -- Contains: description, code, subcategory, merchant_name, merchant_type
    
    -- Metadata
    confidence DECIMAL(3, 2), -- 0.00 to 1.00
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_user_date (user_id, transaction_date),
    INDEX idx_user_month (user_id, transaction_month),
    INDEX idx_user_category (user_id, category),
    INDEX idx_user_amount (user_id, amount),
    INDEX idx_upload (upload_id)
);
```

### Per-User Merchant Cache Table
```sql
CREATE TABLE merchant_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    merchant_key VARCHAR(255) NOT NULL, -- ENCRYPTED
    category VARCHAR(100) NOT NULL, -- Unencrypted for queries
    encrypted_data JSONB NOT NULL, -- Contains: subcategory, merchant_name, merchant_type
    confidence DECIMAL(3, 2),
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique per user
    UNIQUE KEY unique_user_merchant (user_id, merchant_key),
    INDEX idx_user_category (user_id, category)
);
```

### Processing Queue Table
```sql
CREATE TABLE processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    batch_start INTEGER NOT NULL, -- Starting line number
    batch_end INTEGER NOT NULL,   -- Ending line number
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    attempts INTEGER DEFAULT 0,
    error_message TEXT, -- ENCRYPTED
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_upload_status (upload_id, status)
);
```

## 🔐 Encryption Strategy

### Encryption Library
```javascript
// Using node-forge or crypto-js for AES-256-GCM encryption
import crypto from 'crypto';

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### What Gets Encrypted
- **Raw CSV lines**: Original data
- **Descriptions**: Transaction descriptions
- **Merchant names**: Business names
- **File names**: Original uploaded files
- **Personal identifiers**: Any PII

### What Stays Unencrypted (for queries)
- User IDs
- Dates
- Amounts (for analytics)
- Categories (for filtering)
- Transaction types (+/-)
- Status fields

## 🛣️ API Routes (No Auth for Now)

### Upload Routes
```
POST   /api/uploads              - Upload CSV file (requires user_id in body)
GET    /api/uploads/:userId      - List user's uploads
GET    /api/uploads/:userId/:id  - Get upload details
DELETE /api/uploads/:userId/:id  - Delete upload and its data
POST   /api/uploads/:id/resume   - Resume failed upload processing
```

### Transaction Routes
```
GET    /api/transactions/:userId          - List user's transactions (paginated)
GET    /api/transactions/:userId/:id      - Get transaction details (decrypted)
PATCH  /api/transactions/:userId/:id      - Update transaction
DELETE /api/transactions/:userId/:id      - Delete transaction
GET    /api/transactions/:userId/export   - Export transactions (CSV/JSON)
```

### Processing Routes
```
POST   /api/process/:uploadId/start      - Start/resume processing
GET    /api/process/:uploadId/status     - Get processing status
POST   /api/process/:uploadId/retry      - Retry failed lines
DELETE /api/process/:uploadId/cancel     - Cancel processing
```

### Analytics Routes
```
GET    /api/analytics/:userId/summary       - Overall spending summary
GET    /api/analytics/:userId/categories    - Breakdown by category
GET    /api/analytics/:userId/merchants     - Top merchants (decrypted)
GET    /api/analytics/:userId/trends        - Spending trends
GET    /api/analytics/:userId/monthly       - Monthly breakdown
```

### WebSocket Events
```
ws://localhost:3000/ws?userId={userId}

Events emitted during processing:
- upload:started        { uploadId, filename, totalLines }
- upload:progress       { uploadId, phase, progress, message }
- lines:stored          { uploadId, stored, total }
- batch:processing      { uploadId, batchId, start, end }
- separator:detected    { uploadId, separator, confidence }
- mapping:detected      { uploadId, fieldCount }
- transform:progress    { uploadId, processed, total, failed }
- categorize:progress   { uploadId, batch, totalBatches }
- categorize:cached     { uploadId, cachedCount } 
- save:progress         { uploadId, saved, total }
- upload:completed      { uploadId, processed, failed, statistics }
- upload:failed         { uploadId, error, canRetry }
```

## 📦 Dependencies

```json
{
  "dependencies": {
    "@fastify/cors": "^8.x",
    "@fastify/helmet": "^11.x",
    "@fastify/multipart": "^8.x",
    "@fastify/postgres": "^5.x",
    "@fastify/rate-limit": "^8.x",
    "@fastify/static": "^6.x",
    "@fastify/websocket": "^8.x",
    "fastify": "^4.x",
    "pg": "^8.x",
    "uuid": "^9.x",
    "csv-parser": "^3.x",
    "agentnet": "latest",
    "dotenv": "^16.x",
    "crypto-js": "^4.x",
    "bull": "^4.x",
    "pino": "^8.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "nodemon": "^3.x",
    "pino-pretty": "^10.x"
  }
}
```

## 🔄 Progressive Processing Flow

### 1. Upload Phase
```javascript
async function handleUpload(userId, file) {
  // 1. Create upload record
  const uploadId = await createUploadRecord(userId, file);
  
  // 2. Stream CSV and store lines
  let lineNumber = 0;
  const reader = createReadStream(file.path)
    .pipe(split()) // Line by line
    .on('data', async (line) => {
      // Encrypt and store each line
      const encrypted = encryptionService.encrypt(line);
      await storeRawLine(userId, uploadId, lineNumber++, encrypted);
      
      // Emit progress every 100 lines
      if (lineNumber % 100 === 0) {
        ws.send('lines:stored', { stored: lineNumber });
      }
    });
  
  // 3. Create processing batches
  await createProcessingBatches(uploadId, lineNumber);
  
  return uploadId;
}
```

### 2. Processing Phase (Progressive)
```javascript
async function processUploadProgressive(uploadId, userId) {
  // 1. Get unprocessed lines in batches
  const batchSize = config.PROCESSING_BATCH_SIZE || 50;
  
  while (true) {
    // 2. Get next unprocessed batch
    const lines = await getUnprocessedLines(uploadId, batchSize);
    if (lines.length === 0) break;
    
    // 3. Decrypt lines
    const decryptedLines = lines.map(line => ({
      ...line,
      data: encryptionService.decrypt(line.raw_data)
    }));
    
    // 4. Process batch (existing logic)
    const processed = await processBatch(decryptedLines, userId);
    
    // 5. Save results (encrypted)
    for (const transaction of processed) {
      const encrypted = {
        description: transaction.description,
        code: transaction.code,
        subcategory: transaction.subcategory,
        merchant_name: transaction.merchantName,
        merchant_type: transaction.merchantType
      };
      
      await saveTransaction({
        ...transaction,
        encrypted_data: encryptionService.encrypt(JSON.stringify(encrypted))
      });
    }
    
    // 6. Mark lines as processed
    await markLinesProcessed(lines.map(l => l.id));
    
    // 7. Update progress
    ws.send('batch:completed', { uploadId, processed: lines.length });
  }
}
```

## ⚙️ Rate Limiting Configuration

```javascript
// config/rateLimits.js
export const rateLimits = {
  // Global rate limit
  global: {
    max: 1000,        // requests
    timeWindow: '1m'  // per minute
  },
  
  // Upload rate limit
  upload: {
    max: process.env.UPLOAD_RATE_LIMIT || 10,
    timeWindow: '1h',  // 10 uploads per hour
    keyGenerator: (req) => req.body.userId
  },
  
  // Processing rate limit
  processing: {
    max: process.env.PROCESSING_RATE_LIMIT || 100,
    timeWindow: '1h',  // 100 processing requests per hour
    keyGenerator: (req) => req.params.userId
  },
  
  // AI categorization rate limit
  aiCategorization: {
    max: process.env.AI_RATE_LIMIT || 5000,
    timeWindow: '1h',  // 5000 AI calls per hour
    keyGenerator: (req) => req.body.userId
  },
  
  // WebSocket connections
  websocket: {
    max: process.env.WS_RATE_LIMIT || 5,
    timeWindow: '1m',  // 5 connections per minute
    keyGenerator: (req) => req.query.userId
  }
};

// Apply to routes
fastify.register(rateLimit, rateLimits.upload);
fastify.post('/api/uploads', uploadHandler);
```

## 🚀 Implementation Steps (Revised)

### Phase 1: Core Setup (Day 1)
- [x] Skip authentication for now
- [ ] Setup PostgreSQL with encryption tables
- [ ] Create encryption service
- [ ] Setup Fastify with rate limiting
- [ ] Create database migrations

### Phase 2: Progressive Upload System (Day 2)
- [ ] Implement CSV line-by-line storage
- [ ] Create raw_csv_lines table handlers
- [ ] Implement encryption for sensitive data
- [ ] Create batch processing queue

### Phase 3: Processing Pipeline (Day 3-4)
- [ ] Adapt existing parser.js for line-by-line processing
- [ ] Implement progressive batch processing
- [ ] Create per-user merchant cache
- [ ] Handle partial failures gracefully

### Phase 4: WebSocket Integration (Day 5)
- [ ] Setup WebSocket server
- [ ] Create event system for progress
- [ ] Implement reconnection logic
- [ ] Add progress persistence

### Phase 5: API Endpoints (Day 6)
- [ ] Transaction routes with decryption
- [ ] Analytics with encrypted data
- [ ] Export functionality
- [ ] Rate limiting per endpoint

### Phase 6: Error Recovery (Day 7)
- [ ] Retry failed lines
- [ ] Resume interrupted uploads
- [ ] Cleanup orphaned data
- [ ] Error reporting

### Phase 7: Testing & Optimization (Day 8)
- [ ] Load testing with large files
- [ ] Encryption performance testing
- [ ] Database query optimization
- [ ] Add monitoring

## 🔐 Security & Privacy

### Data Protection
1. **Encryption at Rest**
   - AES-256-GCM for sensitive fields
   - Unique IV per encryption
   - Key rotation strategy

2. **Query Privacy**
   - Only non-sensitive fields indexed
   - Aggregations on encrypted data
   - Audit logging for access

3. **Rate Limiting**
   - Per-user limits
   - Endpoint-specific limits
   - AI usage limits

### Compliance Considerations
- GDPR: Right to deletion
- Data minimization
- Encryption key management
- Audit trails

## 🎯 Performance Goals

- Process 1000 lines in < 10 seconds
- Encrypt/decrypt < 5ms per record
- Support files up to 1M lines
- Handle 10 concurrent uploads
- WebSocket latency < 100ms

## 📝 Environment Variables

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wheremymoneygoes
DB_POOL_MIN=2
DB_POOL_MAX=10

# Encryption
ENCRYPTION_KEY=64-character-hex-string-for-aes-256
ENCRYPTION_SALT=random-salt-for-key-derivation

# Rate Limits
UPLOAD_RATE_LIMIT=10
PROCESSING_RATE_LIMIT=100
AI_RATE_LIMIT=5000
WS_RATE_LIMIT=5

# Processing
PROCESSING_BATCH_SIZE=50
MAX_PARALLEL_BATCHES=10
RETRY_ATTEMPTS=3

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600  # 100MB
MAX_LINES_PER_FILE=1000000  # 1M lines

# AI Services
OPENAI_API_KEY=your-api-key
GPT_MODEL=gpt-4.1-mini-2025-04-14

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_RECONNECT_INTERVAL=5000

# Logging
LOG_LEVEL=info
```

## 🏗️ Next Implementation Priority

1. **Immediate (Phase 1-2)**:
   - Setup encrypted database schema
   - Create encryption service
   - Implement progressive CSV storage
   - Basic rate limiting

2. **Core Processing (Phase 3-4)**:
   - Adapt processors for line-by-line
   - Per-user merchant cache
   - WebSocket progress events

3. **API & Polish (Phase 5-7)**:
   - Complete REST API
   - Error recovery
   - Performance optimization

---

**Ready to start implementation with encryption and progressive processing!** 🚀