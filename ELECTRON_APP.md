# WhereMyMoneyGoes - Electron App Migration Plan

## Executive Summary

This document outlines the complete migration plan from the current web application (Vue 3 + Fastify + PostgreSQL) to an Electron desktop application with local SQLite database and minimal server dependencies. The UI will remain exactly the same, with all Vue components and styling preserved.

## Architecture Overview

### Current Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Vue 3 Frontend │────▶│  Fastify Server  │────▶│  PostgreSQL  │
│   (Web Browser) │◀────│  (All Services)  │◀────│  (Encrypted) │
└─────────────────┘     └──────────────────┘     └──────────────┘
         ▲                       │                        
         └───── WebSocket ───────┘                        
```

### Target Electron Architecture
```
┌──────────────────────────────────────────┐     ┌─────────────────┐
│           Electron Application           │     │  Minimal Server │
│  ┌────────────────┐  ┌────────────────┐ │     │                 │
│  │ Vue 3 Frontend │  │  Main Process  │ │────▶│  - LLM Proxy    │
│  │  (Unchanged)   │◀▶│  (Node.js)     │ │     │  - Auth Service │
│  └────────────────┘  └────────────────┘ │     │  - Sync (opt)   │
│           ▲                   │          │     └─────────────────┘
│           │ IPC               │          │
│           ▼                   ▼          │
│  ┌────────────────────────────────────┐ │
│  │     SQLite Database (Encrypted)    │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## Database Architecture - Server vs Local

### Server Database (PostgreSQL) - Dual Purpose

The server database supports both web users and Electron app authentication:

#### Core Tables (Used by Both Web & Electron)

##### 1. **users** (Central Authentication)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

##### 2. **auth_tokens** (Session Management)
```sql
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    app_type VARCHAR(20), -- 'web', 'electron', 'mobile'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### 3. **api_usage** (LLM Usage Tracking)
```sql
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    tokens_used INTEGER,
    cost DECIMAL(10, 4),
    model VARCHAR(50),
    source VARCHAR(20), -- 'web' or 'electron'
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Web-Only Tables (Full Application Data for Web Users)

For users who use the web version, the server stores all their data:

##### 4. **web_accounts** (Web Users' Bank Accounts)
```sql
CREATE TABLE web_accounts (
    -- Same structure as local accounts table
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_name VARCHAR(255),
    -- ... all account fields
);
```

##### 5. **web_transactions** (Web Users' Transactions)
```sql
CREATE TABLE web_transactions (
    -- Same structure as local transactions table
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    -- ... all transaction fields with encryption
);
```

##### 6. **web_uploads**, **web_merchant_cache**, etc.
All the tables that exist locally for Electron users also exist on the server prefixed with `web_` for web-only users.

### Local Database (SQLite) - Complete Application Data

All financial and application data moves to local SQLite:

#### 1. Users Table (Local Copy - NO PASSWORD)
```sql
-- SQLite Version - Synced from server, no password stored locally
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Same ID as server for data consistency
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    -- NO password_hash - never stored locally for security
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Local-only fields
    last_sync DATETIME,
    cached_auth_token TEXT, -- Encrypted JWT token for API calls
    local_settings TEXT -- JSON with user preferences
);

CREATE INDEX idx_users_email ON users(email);
```

**Important Note**: The users table exists in BOTH places:
- **Server**: Full authentication data including password hash
- **Local**: User info WITHOUT password, plus cached token for API calls
- **Same user ID**: Ensures data consistency between local and server

#### 2. Accounts Table
```sql
CREATE TABLE accounts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_type TEXT DEFAULT 'checking',
    bank_name TEXT,
    account_number_last4 TEXT, -- Will be encrypted
    currency TEXT DEFAULT 'EUR',
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'BuildingLibraryIcon',
    is_active INTEGER DEFAULT 1, -- Boolean as INTEGER
    is_default INTEGER DEFAULT 0,
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user ON accounts(user_id);
CREATE UNIQUE INDEX unique_user_default_account 
ON accounts(user_id, is_default) WHERE is_default = 1;
```

#### 3. Transactions Table
```sql
CREATE TABLE transactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
    upload_id TEXT NOT NULL,
    raw_line_id TEXT,
    transaction_date DATE NOT NULL,
    transaction_month TEXT, -- YYYY-MM format
    transaction_year INTEGER,
    kind TEXT NOT NULL CHECK (kind IN ('+', '-')),
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    category TEXT,
    encrypted_data TEXT NOT NULL, -- JSON string
    confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
    transaction_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_user_month ON transactions(user_id, transaction_month);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category);
CREATE UNIQUE INDEX idx_transactions_hash ON transactions(user_id, transaction_hash);
```

#### 4. Other Tables
- **uploads**: Track CSV file imports
- **raw_csv_lines**: Store original CSV data
- **merchant_cache**: AI-learned merchant categorizations
- **processing_queue**: Manage batch processing (may be simplified for local)

### Database Migration Summary

#### What Stays on Server (PostgreSQL):
- ✅ **users** - Authentication only
- ✅ **auth_tokens** - Session management
- ✅ **api_usage** - LLM usage tracking
- ✅ **conversation_history** - Optional AI context

#### What Moves to Local (SQLite):
- ➡️ **users** - Cached copy without password
- ➡️ **accounts** - All bank accounts
- ➡️ **transactions** - All financial transactions
- ➡️ **uploads** - CSV upload history
- ➡️ **raw_csv_lines** - Original CSV data
- ➡️ **merchant_cache** - AI categorization cache
- ➡️ **processing_queue** - Local processing queue

### Encryption Strategy

#### Local Encryption (SQLite)
- Use **SQLCipher** extension for transparent database encryption
- Or implement application-level encryption using the existing AES-256-GCM service
- Encryption key derived from user's master password (stored in system keychain)

```javascript
// electron/services/encryptionService.js
import keytar from 'keytar';
import crypto from 'crypto';

class LocalEncryptionService {
  async getOrCreateKey() {
    const SERVICE = 'WhereMyMoneyGoes';
    const ACCOUNT = 'EncryptionKey';
    
    let key = await keytar.getPassword(SERVICE, ACCOUNT);
    if (!key) {
      key = crypto.randomBytes(32).toString('hex');
      await keytar.setPassword(SERVICE, ACCOUNT, key);
    }
    return Buffer.from(key, 'hex');
  }
  
  // Reuse existing encrypt/decrypt methods
}
```

## Server Architecture - Multi-Purpose Backend

### Server Responsibilities

The server will handle three main functions:

#### 1. **Marketing Website & Landing Pages**
- **Routes**: `/`, `/features`, `/pricing`, `/about`, `/blog`
- **Implementation**: Static site or SSR with Next.js/Nuxt
- **Purpose**: Product marketing, SEO, user acquisition

#### 2. **Web App Version** (Optional)
- **Route**: `/app/*`
- **Implementation**: Same Vue 3 app served for web users
- **Purpose**: Allow users to try before downloading, web-only users

#### 3. **API Services**
- **Routes**: `/api/*`
- **Purpose**: Services needed by both web and Electron versions

### API Routes That Remain Server-Side

#### 1. LLM/AI Processing (`/api/assistant/*`)
- **Reason**: Requires OpenAI API keys and cloud compute
- **Used by**: Both web app and Electron app
- **Endpoints**:
  - `POST /api/assistant/chat` - Process chat messages
  - `GET /api/assistant/suggestions` - Get AI suggestions

#### 2. Authentication (`/api/auth/*`)
- **Reason**: Central auth for web, Electron, and future mobile apps
- **Endpoints**:
  - `POST /api/auth/login`
  - `POST /api/auth/signup`
  - `GET /api/auth/verify`
  - `POST /api/auth/logout`
  - `POST /api/auth/reset-password` - Email-based reset

#### 3. Web App Data APIs (`/api/web/*`)
- **Reason**: Web users need server-side data storage
- **Used by**: Web app only (Electron uses local SQLite)
- **Endpoints**: Full CRUD operations for web users
  - `/api/web/accounts`
  - `/api/web/transactions`
  - `/api/web/analytics`
  - `/api/web/uploads`

### Routes That Move to Local (Electron Main Process)

#### 1. Data Management
All these become IPC calls instead of HTTP:

- **Accounts** (`/api/accounts/*`)
  - `GET /` - List accounts → `ipcMain.handle('accounts:list')`
  - `POST /` - Create account → `ipcMain.handle('accounts:create')`
  - `PATCH /:id` - Update account → `ipcMain.handle('accounts:update')`
  - `DELETE /:id` - Delete account → `ipcMain.handle('accounts:delete')`

- **Transactions** (`/api/transactions/*`)
  - `GET /` - List transactions → `ipcMain.handle('transactions:list')`
  - `GET /:id` - Get transaction → `ipcMain.handle('transactions:get')`
  - `PATCH /:id` - Update transaction → `ipcMain.handle('transactions:update')`
  - `DELETE /:id` - Delete transaction → `ipcMain.handle('transactions:delete')`

- **Analytics** (`/api/analytics/*`)
  - `GET /summary` - Get summary → `ipcMain.handle('analytics:summary')`
  - `GET /categories` - Category breakdown → `ipcMain.handle('analytics:categories')`
  - `GET /merchants` - Top merchants → `ipcMain.handle('analytics:merchants')`
  - `GET /trends` - Spending trends → `ipcMain.handle('analytics:trends')`

- **Uploads** (`/api/uploads/*`)
  - `POST /` - Upload CSV → `ipcMain.handle('upload:process')`
  - `GET /` - List uploads → `ipcMain.handle('uploads:list')`
  - Direct file system access, no need for multipart forms

#### 2. WebSocket → IPC Events
Replace WebSocket with Electron's IPC for real-time updates:

```javascript
// Before (WebSocket)
websocketService.sendToUser(userId, 'processing:progress', { 
  uploadId, 
  progress: 50 
});

// After (IPC)
mainWindow.webContents.send('processing:progress', { 
  uploadId, 
  progress: 50 
});
```

## Frontend Architecture - NO DUPLICATION NEEDED

### ⚠️ IMPORTANT: Single Frontend Codebase
**The Vue 3 frontend remains EXACTLY THE SAME** - no copying, no duplication. The same `src/app/` folder is used for both web and Electron builds. Only a small API abstraction layer is added to handle the difference between HTTP (web) and IPC (Electron) calls.

### File Structure - What Changes and What Doesn't
```
wheremymoneygoes/
├── src/app/              # ✅ UNCHANGED - Same Vue app for both targets
│   ├── components/       # ✅ No changes needed
│   ├── pages/           # ✅ No changes needed
│   ├── stores/          # ✅ No changes needed
│   ├── assets/          # ✅ No changes needed
│   ├── router.js        # ✅ No changes needed
│   ├── main.js          # ✅ No changes needed
│   ├── App.vue          # ✅ No changes needed
│   └── services/
│       └── api/
│           ├── client.js          # ⚠️ Minor modification (add detection)
│           └── electronBridge.js  # 🆕 NEW: Abstraction layer (small file)
│
├── electron/            # 🆕 NEW: Electron-specific files only
│   ├── main.js         # Electron main process
│   ├── preload.js      # Security bridge
│   └── handlers/       # IPC handlers (replace server routes)
│
└── dist/               # Build output
    ├── web/           # Web version build
    └── electron/      # Electron app build (includes web build)
```

### API Client Abstraction Layer (Only Frontend Change)

Modify the existing API client to detect environment:

```javascript
// src/app/services/api/client.js - Modified slightly
import axios from 'axios'
import { API_BASE_URL } from '@/utils/constants'

class APIClient {
  constructor() {
    // Detect if running in Electron
    this.isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
  }
  
  async request(endpoint, method, data) {
    if (this.isElectron) {
      // Use IPC for local operations
      return await window.electronAPI.invoke(endpoint, data);
    } else {
      // Use HTTP for web version
      return await axios[method](`${API_BASE_URL}/api/${endpoint}`, data);
    }
  }
  
  // Example methods
  async getTransactions(params) {
    return this.request('transactions', 'get', params);
  }
  
  async createAccount(data) {
    return this.request('accounts', 'post', data);
  }
  
  // LLM calls always go through server (both web and Electron)
  async sendAssistantMessage(message) {
    // Always uses HTTP, even in Electron
    return await axios.post(`${API_BASE_URL}/api/assistant/chat`, {
      message,
      token: this.isElectron ? await window.electronAPI.getAuthToken() : null
    });
  }
}

export default new APIClient()
```

### Preload Script (Electron Security Bridge)
```javascript
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  
  // Real-time events
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  
  // File operations
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  
  // Auth token management
  getAuthToken: () => ipcRenderer.invoke('auth:getToken'),
  setAuthToken: (token) => ipcRenderer.invoke('auth:setToken', token)
});
```

### Build Process - One Source, Two Targets
```json
// package.json
{
  "scripts": {
    // Development
    "dev:web": "vite",                    // Web dev server
    "dev:electron": "concurrently \"vite\" \"electron .\"",  // Both Vite + Electron
    
    // Production builds from SAME source
    "build:web": "vite build --outDir dist/web",
    "build:electron": "vite build --outDir dist/electron && electron-builder",
    "build:all": "npm run build:web && npm run build:electron"
  }
}
```

### How Electron Loads the Vue App
```javascript
// electron/main.js
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  if (process.env.NODE_ENV === 'development') {
    // Development: Load from same Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load built Vue app
    mainWindow.loadFile('dist/electron/index.html');
  }
}
```

### Summary of Frontend Changes
1. **99% unchanged** - All Vue components, stores, routes stay exactly the same
2. **1% modified** - API client gets environment detection
3. **New files** - Only Electron-specific files in `electron/` folder
4. **Same UI** - Pixel-perfect identical user interface
5. **Same development** - Hot reload, dev tools all work the same

## Electron Main Process Structure

```
electron/
├── main.js                 # Main entry point
├── preload.js              # Preload script
├── services/
│   ├── database.js         # SQLite connection & queries
│   ├── encryption.js       # Local encryption service
│   ├── processing.js       # CSV processing logic
│   ├── analytics.js        # Analytics calculations
│   └── apiProxy.js         # Proxy for server calls
├── handlers/
│   ├── accounts.js         # Account IPC handlers
│   ├── transactions.js     # Transaction IPC handlers
│   ├── analytics.js        # Analytics IPC handlers
│   └── uploads.js          # Upload IPC handlers
└── migrations/
    └── *.sql               # SQLite migration files
```

### Main Process Example
```javascript
// electron/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

// Import handlers
const { setupAccountHandlers } = require('./handlers/accounts');
const { setupTransactionHandlers } = require('./handlers/transactions');
const { setupAnalyticsHandlers } = require('./handlers/analytics');

let mainWindow;
let db;

app.whenReady().then(() => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'wheremymoneygoes.db');
  db = new Database(dbPath);
  
  // Run migrations
  require('./migrations/run')(db);
  
  // Setup IPC handlers
  setupAccountHandlers(ipcMain, db);
  setupTransactionHandlers(ipcMain, db);
  setupAnalyticsHandlers(ipcMain, db);
  
  // Create window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  // Load Vue app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
});
```

## Auto-Update Mechanism

### Using electron-updater
```javascript
// electron/updater.js
const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

class AppUpdater {
  constructor() {
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: 'A new version is available. It will be downloaded in the background.',
        buttons: ['OK']
      });
    });
    
    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }
}

module.exports = AppUpdater;
```

### Configuration
```json
// package.json additions
{
  "build": {
    "appId": "com.wheremymoneygoes.app",
    "productName": "WhereMyMoneyGoes",
    "directories": {
      "output": "dist-electron"
    },
    "publish": {
      "provider": "github",
      "owner": "yourusername",
      "repo": "wheremymoneygoes"
    },
    "mac": {
      "category": "public.app-category.finance"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

## Data Sync Strategy (Optional)

### Hybrid Sync Approach
1. **Local First**: All data stored locally in SQLite
2. **Optional Cloud Sync**: User can enable sync to cloud
3. **Conflict Resolution**: Last-write-wins with version tracking

```javascript
// electron/services/syncService.js
class SyncService {
  async syncToCloud() {
    if (!this.isSyncEnabled()) return;
    
    const lastSync = await this.getLastSyncTime();
    const localChanges = await this.getChangesSince(lastSync);
    
    if (localChanges.length > 0) {
      const encrypted = await this.encryptForTransport(localChanges);
      await this.uploadToServer(encrypted);
    }
    
    const serverChanges = await this.fetchServerChanges(lastSync);
    await this.applyServerChanges(serverChanges);
    await this.updateLastSyncTime();
  }
  
  async enableSync(email, password) {
    // Authenticate with server
    const token = await this.authenticate(email, password);
    await keytar.setPassword('WhereMyMoneyGoes', 'SyncToken', token);
    
    // Initial sync
    await this.syncToCloud();
    
    // Schedule periodic sync
    setInterval(() => this.syncToCloud(), 5 * 60 * 1000); // Every 5 minutes
  }
}
```

## Migration Steps

### Phase 1: Setup Electron Shell (Week 1)
1. ✅ Create Electron main process
2. ✅ Setup preload script with IPC channels
3. ✅ Configure build process
4. ✅ Test Vue app loading in Electron

### Phase 2: Database Migration (Week 1-2)
1. ✅ Convert PostgreSQL schemas to SQLite
2. ✅ Implement local encryption service
3. ✅ Create migration system for SQLite
4. ✅ Test data integrity and performance

### Phase 3: IPC Implementation (Week 2-3)
1. ✅ Replace HTTP endpoints with IPC handlers
2. ✅ Convert WebSocket to IPC events
3. ✅ Implement file system access for uploads
4. ✅ Test all data operations locally

### Phase 4: API Abstraction Layer (Week 3)
1. ✅ Create unified API client
2. ✅ Maintain backward compatibility
3. ✅ Test both Electron and web modes
4. ✅ Ensure UI remains unchanged

### Phase 5: Server Minimization (Week 4)
1. ✅ Extract LLM proxy service
2. ✅ Implement lightweight auth service
3. ✅ Setup secure API gateway
4. ✅ Deploy minimal server

### Phase 6: Polish & Distribution (Week 4-5)
1. ✅ Implement auto-updater
2. ✅ Add code signing
3. ✅ Create installers for each platform
4. ✅ Test on all target platforms

## Security Considerations

### Local Security
1. **Database Encryption**: SQLCipher or app-level encryption
2. **Key Storage**: System keychain (Keytar)
3. **IPC Security**: Context isolation, no node integration in renderer
4. **CSP Headers**: Strict content security policy

### Server Communication
1. **HTTPS Only**: All server communication over TLS
2. **JWT Tokens**: Short-lived tokens for API access
3. **Rate Limiting**: Prevent API abuse
4. **Input Validation**: Sanitize all inputs

## Performance Optimizations

### Database
1. **Indexes**: Proper indexing for common queries
2. **Batch Operations**: Process CSV in chunks
3. **Connection Pooling**: Reuse database connections
4. **Query Optimization**: Use prepared statements

### UI
1. **Lazy Loading**: Load data as needed
2. **Virtual Scrolling**: For large transaction lists
3. **Caching**: Cache computed analytics
4. **Web Workers**: Background processing for heavy computations

## Dependencies to Add

```json
// package.json additions
{
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.6.0",
    "@electron-forge/cli": "^7.0.0"
  },
  "dependencies": {
    "better-sqlite3": "^9.0.0",
    "electron-updater": "^6.1.0",
    "keytar": "^7.9.0",
    "electron-store": "^8.1.0"
  }
}
```

## Server Structure - Supporting Multiple Platforms

### Unified Server Architecture
```
server/
├── public/                  # Marketing website
│   ├── index.html          # Landing page
│   ├── features.html       # Features page
│   ├── pricing.html        # Pricing/plans
│   └── assets/             # Marketing assets
│
├── app/                     # Web app (same Vue build)
│   └── dist/               # Built Vue app for web users
│
├── api/
│   ├── routes/
│   │   ├── auth.js         # Shared authentication
│   │   ├── assistant.js    # LLM proxy (shared)
│   │   ├── web/            # Web-only endpoints
│   │   │   ├── accounts.js
│   │   │   ├── transactions.js
│   │   │   ├── analytics.js
│   │   │   └── uploads.js
│   │   └── admin/          # Admin dashboard
│   │       └── stats.js
│   │
│   └── services/
│       ├── database.js     # PostgreSQL connection
│       ├── llmProxy.js     # OpenAI wrapper
│       └── emailService.js # Password reset, notifications
│
└── server.js               # Main server entry
```

### Routing Strategy
```javascript
// server.js
app.use('/', express.static('public'));           // Marketing site
app.use('/app', express.static('app/dist'));      // Web app
app.use('/api', apiRoutes);                       // All APIs

// API route detection
app.post('/api/transactions', async (req, res) => {
  const source = req.headers['x-app-source']; // 'web' or 'electron'
  
  if (source === 'electron') {
    // Electron should use local storage
    return res.status(400).json({ 
      error: 'Use local storage for Electron app' 
    });
  }
  
  // Web users get full server-side processing
  // ... handle transaction for web user
});
```

### User Journey Examples

#### 1. **New User - Marketing Site**
- Visits `wheremymoneygoes.com` → Marketing landing page
- Clicks "Try Online" → `/app` (web version)
- Clicks "Download Desktop" → Downloads Electron app
- Both use same account via `/api/auth`

#### 2. **Web User**
- Uses app at `wheremymoneygoes.com/app`
- All data stored in PostgreSQL (`web_*` tables)
- Full functionality through browser
- Can later download Electron and migrate data

#### 3. **Electron User**
- Downloads desktop app
- Logs in (auth via server API)
- All data stored locally in SQLite
- Only contacts server for auth & AI

#### 4. **Hybrid User**
- Uses Electron at home (local data)
- Uses web app at work (server data)
- Same login, different data storage
- Optional sync between them

## Conclusion

This migration plan creates a flexible architecture that supports:
1. **Marketing website** for user acquisition
2. **Web application** for easy onboarding
3. **Electron app** for privacy-focused users
4. **Shared authentication** across all platforms
5. **Future mobile apps** using same auth/API

The server remains important but becomes more focused on user acquisition, authentication, and providing services rather than data storage for desktop users.

### Key Benefits
1. **Privacy**: Financial data stays local
2. **Performance**: No network latency for data operations
3. **Offline Support**: Works without internet (except AI features)
4. **Cost Reduction**: Minimal server infrastructure
5. **User Control**: Complete data ownership

The migration can be done incrementally, maintaining both web and desktop versions during the transition.
