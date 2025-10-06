# WhereMyMoneyGoes - Backend

AI-powered financial transaction categorization system with real-time processing and encrypted data storage.

## 🚀 Features

- **CSV Processing**: Auto-detect separators and field mappings
- **AI Categorization**: Smart expense categorization using GPT
- **Data Encryption**: AES-256-GCM encryption for sensitive data
- **Real-time Updates**: WebSocket notifications for processing progress
- **Progressive Processing**: Handle large files efficiently
- **Per-User Merchant Cache**: Learn from user patterns
- **Comprehensive Analytics**: Spending trends, categories, top merchants

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OpenAI API key (for categorization)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd wheremymoneygoes
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup PostgreSQL database and run migrations**
```bash
# Option 1: Complete setup (creates database + runs migrations)
npm run setup:complete

# Option 2: Manual steps
npm run setup    # Creates the database
npm run migrate  # Runs migrations
```

5. **Start the server**
```bash
npm run dev  # Development with hot reload
npm start    # Production
```

## 🔑 Environment Variables

Key configuration in `.env`:

```env
# PostgreSQL Database
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=wheremymoneygoes
PG_PASSWORD=postgres
PG_PORT=5432
PG_USE_SSL=false

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-64-character-hex-string

# OpenAI
OPENAI_API_KEY=your-api-key
GPT_MODEL=gpt-4.1-mini-2025-04-14

# Server
PORT=3000
```

## 📡 API Endpoints

### Upload Endpoints
- `POST /api/uploads` - Upload CSV file
- `GET /api/uploads/:userId` - List user uploads
- `GET /api/uploads/:userId/:uploadId` - Get upload details
- `POST /api/uploads/:uploadId/resume` - Resume processing
- `DELETE /api/uploads/:userId/:uploadId` - Delete upload

### Transaction Endpoints
- `GET /api/transactions/:userId` - List transactions (paginated)
- `GET /api/transactions/:userId/:transactionId` - Get transaction
- `PATCH /api/transactions/:userId/:transactionId` - Update transaction
- `DELETE /api/transactions/:userId/:transactionId` - Delete transaction
- `GET /api/transactions/:userId/export` - Export (CSV/JSON)

### Analytics Endpoints
- `GET /api/analytics/:userId/summary` - Overall summary
- `GET /api/analytics/:userId/categories` - Category breakdown
- `GET /api/analytics/:userId/merchants` - Top merchants
- `GET /api/analytics/:userId/trends` - Spending trends
- `GET /api/analytics/:userId/monthly` - Monthly breakdown

### WebSocket
- `WS /ws?userId={userId}` - Real-time updates

## 🔄 Processing Flow

1. **Upload**: CSV file uploaded and lines stored encrypted
2. **Detect**: Auto-detect separator and field mappings
3. **Transform**: Convert to standardized format
4. **Categorize**: AI categorization with caching
5. **Store**: Save encrypted transactions
6. **Notify**: Real-time WebSocket updates

## 🔐 Security Features

- **Encryption at Rest**: Sensitive data encrypted with AES-256-GCM
- **Per-User Isolation**: Complete data separation
- **Rate Limiting**: Configurable limits per endpoint
- **Input Validation**: File type and size restrictions

## 📊 WebSocket Events

Events emitted during processing:
- `upload:started` - Upload initiated
- `lines:stored` - CSV lines stored
- `separator:detected` - Separator identified
- `mapping:detected` - Fields mapped
- `batch:processing` - Batch being processed
- `categorize:progress` - Categorization progress
- `upload:completed` - Processing complete
- `upload:failed` - Error occurred

## 🧪 Testing

Run the test script:
```bash
node test-backend.js
```

This will test:
- Health endpoint
- WebSocket connection
- File upload
- Transaction retrieval
- Analytics

## 📝 Example Usage

### Upload a CSV file
```javascript
const formData = new FormData();
formData.append('file', fileInput);
formData.append('userId', 'test_user_1');

const response = await fetch('http://localhost:3000/api/uploads', {
    method: 'POST',
    body: formData
});
```

### Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?userId=test_user_1');

ws.on('message', (data) => {
    const event = JSON.parse(data);
    console.log('Event:', event.type, event.data);
});
```

### Get transactions
```javascript
const response = await fetch('http://localhost:3000/api/transactions/test_user_1');
const { data, pagination } = await response.json();
```

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vue 3     │────▶│   Fastify    │────▶│  PostgreSQL  │
│  Frontend   │◀────│   Backend    │◀────│  (Encrypted) │
└─────────────┘     └──────────────┘     └──────────────┘
       ▲                    │                     
       │                    ▼                     
       └── WebSocket ───────┘                     
```

## 📁 Project Structure

```
src/
├── server/
│   ├── index.js          # Entry point
│   ├── app.js            # Fastify setup
│   ├── config/           # Configuration
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── agents.js         # AI agents
│   ├── parser.js         # CSV parsing
│   └── loader.js         # File loading
└── migrations/           # Database migrations
```

## 🚦 Rate Limits

Default limits (configurable via environment):
- Upload: 10 per hour
- Processing: 100 per hour
- AI calls: 5000 per hour
- WebSocket: 5 connections per minute

## 🐛 Troubleshooting

### Database connection issues
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists

### Upload failures
- Check file size (max 100MB default)
- Ensure CSV format
- Verify user exists in database

### Processing stuck
- Check logs for errors
- Use resume endpoint
- Verify OpenAI API key

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome! Please follow existing code style.

---

Built with ❤️ for better financial insights
