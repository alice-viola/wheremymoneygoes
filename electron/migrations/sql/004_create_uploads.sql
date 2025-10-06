-- Create uploads table for tracking CSV imports
CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    processed_lines INTEGER DEFAULT 0,
    successful_lines INTEGER DEFAULT 0,
    failed_lines INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uploads_user 
ON uploads(user_id);

CREATE INDEX IF NOT EXISTS idx_uploads_status 
ON uploads(status);

CREATE INDEX IF NOT EXISTS idx_uploads_created 
ON uploads(created_at DESC);
