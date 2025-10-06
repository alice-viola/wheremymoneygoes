# Database Configuration Update

## Important Changes

The database configuration has been updated to use the `postgres` database with a `wheremymoneygoes` schema instead of a separate database.

## Environment Variables

Create a `.env` file in the project root with the following configuration:

```env
# Database Configuration
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=postgres
PG_PASSWORD=postgres
PG_PORT=5432

# Database Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10

# Encryption Key (IMPORTANT: Change this in production!)
ENCRYPTION_KEY=your-32-character-encryption-key-here-change-me

# Server Configuration
PORT=3000
NODE_ENV=development

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000

# Processing Configuration
BATCH_SIZE=100
PROCESSING_DELAY=100
```

## Key Changes Made

1. **Database**: Now uses `postgres` database instead of `wheremymoneygoes`
2. **Schema**: All tables are now in the `wheremymoneygoes` schema
3. **Table References**: All SQL queries now use schema-qualified table names (e.g., `wheremymoneygoes.users`)
4. **Scripts**: All npm scripts now use `nvm use 22` to ensure Node.js version 22 is used

## Setup Instructions

1. Ensure PostgreSQL is running with the configuration specified in the `.env` file
2. Ensure you have Node.js 22 installed via nvm: `nvm install 22`
3. Run the setup script to create the schema and tables:
   ```bash
   npm run setup:complete
   ```

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run start` - Start production server
- `npm run setup` - Create database and schema
- `npm run migrate` - Run database migrations
- `npm run migrate:reset` - Drop all tables and re-run migrations
- `npm run setup:complete` - Complete setup (database + migrations)
- `npm run clear-data` - Clear all encrypted data from tables

## Migration Files

All migration files have been updated to:
1. Create the `wheremymoneygoes` schema if it doesn't exist (in 001_create_users.sql)
2. Use schema-qualified table names for all CREATE TABLE, ALTER TABLE, and CREATE INDEX statements
3. Use schema-qualified references for foreign keys

## Server Code Updates

All server code has been updated to use schema-qualified table names in:
- `/src/server/config/database.js` - Uses `postgres` database
- `/src/server/services/processingService.js` - All queries use schema-qualified names
- `/src/server/services/uploadService.js` - All queries use schema-qualified names
- `/src/server/routes/analytics.js` - All queries use schema-qualified names
- `/src/server/routes/transactions.js` - All queries use schema-qualified names
- `/src/server/routes/uploads.js` - All queries use schema-qualified names

## Utility Scripts

All utility scripts have been updated:
- `setup-database.js` - Creates `postgres` database and `wheremymoneygoes` schema
- `reset-migrations.js` - Drops schema-qualified tables
- `clear-encrypted-data.js` - Clears data from schema-qualified tables
- `run-migrations-now.js` - Uses schema-qualified migrations table
- `/src/migrations/run.js` - Creates and uses schema-qualified migrations table
