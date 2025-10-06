-- Add transaction_hash field for duplicate detection
ALTER TABLE wheremymoneygoes.transactions 
ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(64);

-- Create unique index on user_id and transaction_hash to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_hash 
ON wheremymoneygoes.transactions(user_id, transaction_hash);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_hash 
ON wheremymoneygoes.transactions(transaction_hash);
