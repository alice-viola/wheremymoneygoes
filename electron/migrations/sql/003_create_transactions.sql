-- Create transactions table for financial transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
    encrypted_data TEXT NOT NULL, -- JSON string with description, merchant, notes
    confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    transaction_hash TEXT, -- For deduplication
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON transactions(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_month 
ON transactions(user_id, transaction_month);

CREATE INDEX IF NOT EXISTS idx_transactions_user_category 
ON transactions(user_id, category);

CREATE INDEX IF NOT EXISTS idx_transactions_account 
ON transactions(account_id);

-- Unique constraint for duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_hash 
ON transactions(user_id, transaction_hash);
