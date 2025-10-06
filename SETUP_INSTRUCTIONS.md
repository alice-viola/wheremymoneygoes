# Setup Instructions

## Database Setup with Proper User IDs

Since we've updated the migrations to use specific UUIDs for test users, you need to reset and recreate the database:

### 1. Reset the Database

```bash
# Drop and recreate the database
node reset-migrations.js

# Or manually with psql:
# psql -U postgres -c "DROP DATABASE IF EXISTS wheremymoneygoes;"
# psql -U postgres -c "CREATE DATABASE wheremymoneygoes;"
```

### 2. Run Migrations

```bash
# Run all migrations including the updated users table
npm run migrate
```

### 3. Verify the Users

The migrations will create two test users with these specific UUIDs:
- **User 1**: `550e8400-e29b-41d4-a716-446655440001` (username: test_user_1)
- **User 2**: `550e8400-e29b-41d4-a716-446655440002` (username: test_user_2)

### 4. Start the Backend

```bash
npm run dev
```

### 5. Start the Frontend

In a new terminal:
```bash
cd src/app
npm install
npm run dev
```

## Important Notes

- The frontend is configured to use User 1's UUID (`550e8400-e29b-41d4-a716-446655440001`) by default
- All API calls will use this real UUID instead of the string "test_user_1"
- The database must be named `wheremymoneygoes` (not `postgres`)

## Troubleshooting

### If you get UUID errors:
- Make sure you've reset the database and run the latest migrations
- Verify the users exist with: `psql -U postgres -d wheremymoneygoes -c "SELECT * FROM users;"`

### If you get connection errors:
- Make sure PostgreSQL is running
- Check that the database `wheremymoneygoes` exists
- Verify your `.env` file has `PG_DATABASE=wheremymoneygoes`

## Testing the API

Once everything is running, you can test the API:

```bash
# Test database connection
curl http://localhost:3000/api/analytics/test

# Test with real user UUID
curl http://localhost:3000/api/analytics/550e8400-e29b-41d4-a716-446655440001/summary
```

The frontend will automatically use the correct UUID from the constants file.
