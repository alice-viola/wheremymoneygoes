-- Create accounts table for bank accounts
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_type TEXT DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings', 'credit', 'investment', 'other')),
    bank_name TEXT,
    account_number_last4 TEXT, -- Encrypted
    currency TEXT DEFAULT 'EUR',
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'BuildingLibraryIcon',
    is_active INTEGER DEFAULT 1, -- Boolean as INTEGER
    is_default INTEGER DEFAULT 0, -- Boolean as INTEGER
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- Ensure only one default account per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_default_account 
ON accounts(user_id, is_default) WHERE is_default = 1;
