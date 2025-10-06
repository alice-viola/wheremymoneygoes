-- Create users table for local storage
-- Note: No password_hash stored locally for security
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Local-only fields
    last_sync DATETIME,
    cached_auth_token TEXT, -- Encrypted JWT token for API calls
    local_settings TEXT -- JSON with user preferences
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
