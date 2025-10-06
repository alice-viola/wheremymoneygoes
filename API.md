# WhereMyMoneyGoes API Documentation

Base URL: `http://localhost:3000`

## 🔑 Authentication

**Note**: Authentication is not implemented yet. All endpoints require a `userId` parameter.

Test users available:
- `test_user_1`
- `test_user_2`

---

## 📤 Upload Endpoints

### Upload CSV File
**POST** `/api/uploads`

Uploads a CSV file for processing. Processing starts automatically in the background.

**Request:**
- Content-Type: `multipart/form-data`
- Body (form-data):
  - `file`: CSV file (required)
  - `userId`: User ID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "uploadId": "uuid-here",
    "filename": "transactions.csv",
    "totalLines": 150,
    "status": "ready_for_processing"
  }
}
```

**Error Responses:**
- `400` - No file uploaded or invalid file type
- `500` - Upload failed

---

### List User Uploads
**GET** `/api/uploads/:userId`

Get all uploads for a user with pagination.

**Parameters:**
- Path: `userId` (required)
- Query:
  - `limit`: Number of results (default: 20)
  - `offset`: Skip records (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "upload-uuid",
      "filename": "transactions.csv",
      "status": "completed",
      "total_lines": 150,
      "processed_lines": 150,
      "failed_lines": 0,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:31:00Z",
      "completed_at": "2024-01-15T10:31:00Z"
    }
  ]
}
```

**Status Values:**
- `pending` - Waiting to start
- `uploading` - File being uploaded
- `processing` - Currently processing
- `completed` - Successfully completed
- `failed` - Processing failed
- `partial` - Partially completed with errors

---

### Get Upload Details
**GET** `/api/uploads/:userId/:uploadId`

Get detailed information about a specific upload.

**Parameters:**
- Path: 
  - `userId` (required)
  - `uploadId` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "upload-uuid",
    "user_id": "user-uuid",
    "filename": "transactions.csv",
    "status": "completed",
    "total_lines": 150,
    "processed_lines": 150,
    "failed_lines": 0,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:31:00Z"
  }
}
```

---

### Resume Processing
**POST** `/api/uploads/:uploadId/resume`

Resume processing for a failed or partial upload.

**Parameters:**
- Path: `uploadId` (required)
- Body (JSON):
  ```json
  {
    "userId": "user-id"
  }
  ```

**Response:**
```json
{
  "success": true,
  "message": "Processing resumed"
}
```

---

### Delete Upload
**DELETE** `/api/uploads/:userId/:uploadId`

Delete an upload and all associated data.

**Parameters:**
- Path:
  - `userId` (required)
  - `uploadId` (required)

**Response:**
```json
{
  "success": true,
  "message": "Upload deleted successfully"
}
```

---

## 💳 Transaction Endpoints

### List Transactions
**GET** `/api/transactions/:userId`

Get user transactions with filtering and pagination.

**Parameters:**
- Path: `userId` (required)
- Query:
  - `limit`: Results per page (default: 50)
  - `offset`: Skip records (default: 0)
  - `category`: Filter by category
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)
  - `uploadId`: Filter by upload

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "transaction-uuid",
      "date": "2024-01-15",
      "kind": "-",
      "amount": 45.50,
      "currency": "EUR",
      "category": "Food & Dining",
      "subcategory": "Restaurant",
      "description": "Pizza Restaurant",
      "merchantName": "Pizza Place",
      "merchantType": "Restaurant",
      "code": "POS123",
      "confidence": 0.95,
      "uploadId": "upload-uuid",
      "createdAt": "2024-01-15T10:31:00Z"
    }
  ],
  "pagination": {
    "total": 500,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Kind Values:**
- `+` - Income/Credit
- `-` - Expense/Debit

---

### Get Single Transaction
**GET** `/api/transactions/:userId/:transactionId`

Get detailed information about a specific transaction.

**Parameters:**
- Path:
  - `userId` (required)
  - `transactionId` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transaction-uuid",
    "date": "2024-01-15",
    "kind": "-",
    "amount": 45.50,
    "currency": "EUR",
    "category": "Food & Dining",
    "subcategory": "Restaurant",
    "description": "Pizza Restaurant Downtown",
    "merchantName": "Pizza Place",
    "merchantType": "Restaurant",
    "code": "POS123",
    "confidence": 0.95,
    "uploadId": "upload-uuid",
    "uploadFilename": "january_transactions.csv",
    "createdAt": "2024-01-15T10:31:00Z"
  }
}
```

---

### Update Transaction
**PATCH** `/api/transactions/:userId/:transactionId`

Update transaction categorization (fix AI mistakes).

**Parameters:**
- Path:
  - `userId` (required)
  - `transactionId` (required)
- Body (JSON):
  ```json
  {
    "category": "Shopping",
    "subcategory": "Groceries",
    "merchantName": "Supermarket XYZ"
  }
  ```

**Response:**
```json
{
  "success": true,
  "message": "Transaction updated successfully"
}
```

---

### Delete Transaction
**DELETE** `/api/transactions/:userId/:transactionId`

Delete a single transaction.

**Parameters:**
- Path:
  - `userId` (required)
  - `transactionId` (required)

**Response:**
```json
{
  "success": true,
  "message": "Transaction deleted successfully"
}
```

---

### Export Transactions
**GET** `/api/transactions/:userId/export`

Export transactions in JSON or CSV format.

**Parameters:**
- Path: `userId` (required)
- Query:
  - `format`: `json` or `csv` (default: json)
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)

**Response (JSON):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-15",
      "type": "expense",
      "amount": 45.50,
      "currency": "EUR",
      "category": "Food & Dining",
      "subcategory": "Restaurant",
      "description": "Pizza Restaurant",
      "merchant": "Pizza Place"
    }
  ]
}
```

**Response (CSV):**
```csv
Date,Type,Amount,Currency,Category,Subcategory,Description,Merchant
2024-01-15,expense,45.50,EUR,Food & Dining,Restaurant,Pizza Restaurant,Pizza Place
```

---

## 📊 Analytics Endpoints

### Overall Summary
**GET** `/api/analytics/:userId/summary`

Get overall spending summary and statistics.

**Parameters:**
- Path: `userId` (required)
- Query:
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 500,
    "totalSpent": 5234.50,
    "totalIncome": 8000.00,
    "netBalance": 2765.50,
    "uniqueCategories": 12,
    "monthsWithData": 6,
    "avgExpense": 45.50,
    "avgIncome": 2000.00,
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-06-30"
    }
  }
}
```

---

### Category Breakdown
**GET** `/api/analytics/:userId/categories`

Get spending breakdown by category.

**Parameters:**
- Path: `userId` (required)
- Query:
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)
  - `kind`: `+` for income, `-` for expenses (default: `-`)

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "category": "Food & Dining",
        "transactionCount": 120,
        "totalAmount": 1450.50,
        "percentage": "27.70",
        "avgAmount": 12.09,
        "minAmount": 3.50,
        "maxAmount": 85.00
      },
      {
        "category": "Shopping",
        "transactionCount": 85,
        "totalAmount": 980.25,
        "percentage": "18.72",
        "avgAmount": 11.53,
        "minAmount": 5.00,
        "maxAmount": 250.00
      }
    ],
    "total": 5234.50,
    "type": "expenses"
  }
}
```

---

### Top Merchants
**GET** `/api/analytics/:userId/merchants`

Get most visited merchants.

**Parameters:**
- Path: `userId` (required)
- Query:
  - `limit`: Number of merchants (default: 10)
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "merchantName": "Supermarket ABC",
      "merchantType": "Grocery Store",
      "visitCount": 24,
      "totalSpent": 850.50,
      "avgAmount": 35.44,
      "categories": ["Shopping"],
      "lastVisit": "2024-06-28"
    },
    {
      "merchantName": "Coffee Shop XYZ",
      "merchantType": "Cafe",
      "visitCount": 45,
      "totalSpent": 225.50,
      "avgAmount": 5.01,
      "categories": ["Food & Dining"],
      "lastVisit": "2024-06-30"
    }
  ]
}
```

---

### Spending Trends
**GET** `/api/analytics/:userId/trends`

Get spending trends over time.

**Parameters:**
- Path: `userId` (required)
- Query:
  - `period`: `day`, `week`, `month`, `year` (default: `month`)
  - `startDate`: Start date (YYYY-MM-DD)
  - `endDate`: End date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "trends": [
      {
        "period": "2024-01",
        "expenses": 850.50,
        "income": 2000.00,
        "netFlow": 1149.50,
        "expenseCount": 45,
        "incomeCount": 1,
        "totalTransactions": 46
      },
      {
        "period": "2024-02",
        "expenses": 920.75,
        "income": 2000.00,
        "netFlow": 1079.25,
        "expenseCount": 52,
        "incomeCount": 1,
        "totalTransactions": 53
      }
    ]
  }
}
```

---

### Monthly Breakdown
**GET** `/api/analytics/:userId/monthly`

Get detailed monthly breakdown with categories.

**Parameters:**
- Path: `userId` (required)
- Query:
  - `year`: Filter by year (e.g., 2024)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "totalExpenses": 850.50,
      "totalIncome": 2000.00,
      "transactionCount": 46,
      "netFlow": 1149.50,
      "avgExpense": 18.92,
      "topCategories": [
        {
          "category": "Food & Dining",
          "amount": 320.50,
          "transactionCount": 18
        },
        {
          "category": "Shopping",
          "amount": 250.00,
          "transactionCount": 12
        }
      ]
    }
  ]
}
```

---

## 🔌 WebSocket Connection

### Connect to WebSocket
**WS** `/ws?userId={userId}`

Real-time updates during file processing.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3000/ws?userId=test_user_1');
```

### Events Received

#### Connection Established
```json
{
  "type": "connected",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Upload Started
```json
{
  "type": "upload:started",
  "data": {
    "uploadId": "uuid",
    "filename": "transactions.csv"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Lines Stored
```json
{
  "type": "lines:stored",
  "data": {
    "uploadId": "uuid",
    "totalLines": 150
  },
  "timestamp": "2024-01-15T10:30:05Z"
}
```

#### Separator Detected
```json
{
  "type": "separator:detected",
  "data": {
    "uploadId": "uuid",
    "separator": ";",
    "confidence": 0.95
  },
  "timestamp": "2024-01-15T10:30:06Z"
}
```

#### Field Mapping Detected
```json
{
  "type": "mapping:detected",
  "data": {
    "uploadId": "uuid",
    "fieldCount": 6
  },
  "timestamp": "2024-01-15T10:30:07Z"
}
```

#### Processing Progress
```json
{
  "type": "upload:progress",
  "data": {
    "uploadId": "uuid",
    "phase": "processing",
    "processed": 75,
    "total": 150,
    "failed": 0
  },
  "timestamp": "2024-01-15T10:30:15Z"
}
```

#### Categorization Progress
```json
{
  "type": "categorize:progress",
  "data": {
    "uploadId": "uuid",
    "processed": 50,
    "total": 150,
    "percentage": 33
  },
  "timestamp": "2024-01-15T10:30:20Z"
}
```

#### Processing Complete
```json
{
  "type": "upload:completed",
  "data": {
    "uploadId": "uuid",
    "statistics": {
      "total_transactions": 150,
      "total_spent": 2345.50,
      "total_income": 3000.00,
      "unique_categories": 8,
      "avg_confidence": 0.92
    },
    "completedAt": "2024-01-15T10:30:30Z"
  },
  "timestamp": "2024-01-15T10:30:30Z"
}
```

#### Processing Failed
```json
{
  "type": "upload:failed",
  "data": {
    "uploadId": "uuid",
    "error": "Error message here",
    "canRetry": true
  },
  "timestamp": "2024-01-15T10:30:30Z"
}
```

### Sending Messages

#### Ping/Pong
```json
{
  "type": "ping"
}
```

Response:
```json
{
  "type": "pong",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🏷️ Categories

### Main Categories Available

1. **Food & Dining** - Restaurants, cafes, groceries, delivery, bakery
2. **Shopping** - Retail, online shopping, clothing, electronics, home improvement
3. **Transportation** - Fuel, public transport, taxi, parking, EV charging, bike share
4. **Utilities** - Electricity, gas, water, internet, phone, heating, sewage
5. **Entertainment** - Movies, concerts, sports, games, streaming, hobbies, nightlife
6. **Health & Wellness** - Medical, pharmacy, gym, therapy, alternative medicine
7. **Travel** - Hotels, flights, vacation rentals, tourism, travel food/shopping
8. **Housing** - Rent, mortgage, maintenance, repairs, HOA fees, moving, security
9. **Financial** - Bank fees, investments, loans, transfers, cryptocurrency, P2P
10. **Education** - Tuition, books, courses, training, tutoring, school fees
11. **Personal Care** - Hair, beauty, spa, laundry, nails, skincare
12. **Insurance** - Health, auto, home, life, pet, travel, business insurance
13. **Pets** - Pet food, veterinary, supplies, grooming, boarding
14. **Subscriptions & Memberships** - Streaming, software, news, clubs, apps
15. **Gifts & Donations** - Gifts, charity, religious, political, tips
16. **Government & Taxes** - Income tax, property tax, registration, licenses, fines
17. **Children & Family** - Childcare, baby supplies, school supplies, kids activities
18. **Business & Professional** - Office supplies, professional services, tools, development
19. **Cash & ATM** - Withdrawals, deposits, cash advances
20. **Income** - Salary, refunds, reimbursements, freelance, rental, dividends
21. **Balance** - Account balances (not transactions)
22. **Other** - Miscellaneous, unknown, uncategorized

### Subcategories

Subcategories are auto-detected by the AI based on transaction details. Common examples:

- **Food & Dining**: Restaurant, Cafe/Coffee, Bar, Groceries, Fast Food, Food Delivery, Catering, Bakery
- **Shopping**: Clothing, Electronics, Home Goods, Books/Media, General Retail, Online Shopping, Home Improvement
- **Transportation**: Fuel/Gas, Public Transport, Taxi/Uber, Parking, Tolls, Vehicle Maintenance, EV Charging
- **Insurance**: Health Insurance, Auto Insurance, Home Insurance, Life Insurance, Pet Insurance
- **Pets**: Pet Food, Veterinary, Pet Supplies, Pet Grooming, Pet Boarding
- **Subscriptions**: Streaming Services, Software, News/Media, Cloud Storage, Music Services
- **Children & Family**: Childcare, Baby Supplies, School Supplies, Kids Activities, Toys
- **Business**: Office Supplies, Professional Services, Coworking, Marketing, Legal Services

---

## 🚨 Error Responses

All endpoints may return these error formats:

### Client Error (4xx)
```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common codes:
- `400` - Bad Request (missing/invalid parameters)
- `403` - Access Denied (wrong user)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)

### Server Error (5xx)
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

In development mode, includes stack trace:
```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "stack": "Error stack trace..."
}
```

---

## 📈 Rate Limits

Default rate limits (configurable):

| Endpoint Type | Limit | Time Window |
|--------------|-------|-------------|
| Upload | 10 | 1 hour |
| Processing | 100 | 1 hour |
| API Calls | 1000 | 1 minute |
| WebSocket | 5 | 1 minute |

Rate limit headers in response:
- `X-RateLimit-Limit`: Maximum requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

---

## 🔧 Health Check

### Server Health
**GET** `/health`

Check if server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

### WebSocket Stats
**GET** `/ws/stats`

Get WebSocket connection statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": 5,
    "connections": 7
  }
}
```

---

## 🎯 Quick Start Example

```javascript
// 1. Upload a CSV file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('userId', 'test_user_1');

const uploadResponse = await fetch('http://localhost:3000/api/uploads', {
  method: 'POST',
  body: formData
});
const { data: upload } = await uploadResponse.json();

// 2. Connect to WebSocket for progress
const ws = new WebSocket('ws://localhost:3000/ws?userId=test_user_1');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Progress:', message.type, message.data);
};

// 3. Get transactions after processing
const txResponse = await fetch(`http://localhost:3000/api/transactions/test_user_1`);
const { data: transactions } = await txResponse.json();

// 4. Get analytics
const analyticsResponse = await fetch(`http://localhost:3000/api/analytics/test_user_1/summary`);
const { data: summary } = await analyticsResponse.json();
```

---

## 📝 Notes for Frontend Development

1. **File Upload**: Use `multipart/form-data` for file uploads
2. **WebSocket**: Connect immediately after upload for real-time progress
3. **Polling**: If WebSocket fails, poll upload status endpoint
4. **Pagination**: All list endpoints support limit/offset
5. **Dates**: Use ISO format (YYYY-MM-DD) for date filters
6. **Amounts**: All amounts are in decimal format (e.g., 45.50)
7. **Error Handling**: Check `success` field in responses
8. **Encryption**: Sensitive data is encrypted server-side
9. **Caching**: Merchant categorizations are cached per user

---

## 🔜 Coming Soon

- JWT Authentication
- User registration/login
- Password reset
- API keys for external access
- Webhook notifications
- Bulk operations
- Advanced filtering
- Custom categories
