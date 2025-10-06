-- Add account_id to all relevant tables for multi-account support

-- 1. Add account_id to uploads table
ALTER TABLE wheremymoneygoes.uploads 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES wheremymoneygoes.accounts(id) ON DELETE CASCADE;

-- 2. Add account_id to raw_csv_lines table
ALTER TABLE wheremymoneygoes.raw_csv_lines 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES wheremymoneygoes.accounts(id) ON DELETE CASCADE;

-- 3. Add account_id to transactions table
ALTER TABLE wheremymoneygoes.transactions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES wheremymoneygoes.accounts(id) ON DELETE CASCADE;

-- 4. Add account_id to merchant_cache table
ALTER TABLE wheremymoneygoes.merchant_cache 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES wheremymoneygoes.accounts(id) ON DELETE CASCADE;

-- 5. Add account_id to processing_queue table
ALTER TABLE wheremymoneygoes.processing_queue 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES wheremymoneygoes.accounts(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uploads_account ON wheremymoneygoes.uploads(account_id);
CREATE INDEX IF NOT EXISTS idx_raw_csv_account ON wheremymoneygoes.raw_csv_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON wheremymoneygoes.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_account_date ON wheremymoneygoes.transactions(user_id, account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_cache_account ON wheremymoneygoes.merchant_cache(account_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_account ON wheremymoneygoes.processing_queue(account_id);

-- Update unique constraint on merchant_cache to include account_id
DROP INDEX IF EXISTS wheremymoneygoes.unique_user_merchant;
CREATE UNIQUE INDEX unique_user_account_merchant ON wheremymoneygoes.merchant_cache(user_id, account_id, merchant_key);

-- Migrate existing data to default accounts
-- This will assign all existing data to the user's default account
UPDATE wheremymoneygoes.uploads u
SET account_id = (
    SELECT id FROM wheremymoneygoes.accounts a 
    WHERE a.user_id = u.user_id AND a.is_default = true
    LIMIT 1
)
WHERE u.account_id IS NULL;

UPDATE wheremymoneygoes.raw_csv_lines r
SET account_id = (
    SELECT id FROM wheremymoneygoes.accounts a 
    WHERE a.user_id = r.user_id AND a.is_default = true
    LIMIT 1
)
WHERE r.account_id IS NULL;

UPDATE wheremymoneygoes.transactions t
SET account_id = (
    SELECT id FROM wheremymoneygoes.accounts a 
    WHERE a.user_id = t.user_id AND a.is_default = true
    LIMIT 1
)
WHERE t.account_id IS NULL;

UPDATE wheremymoneygoes.merchant_cache m
SET account_id = (
    SELECT id FROM wheremymoneygoes.accounts a 
    WHERE a.user_id = m.user_id AND a.is_default = true
    LIMIT 1
)
WHERE m.account_id IS NULL;

UPDATE wheremymoneygoes.processing_queue p
SET account_id = (
    SELECT id FROM wheremymoneygoes.accounts a 
    WHERE a.user_id = p.user_id AND a.is_default = true
    LIMIT 1
)
WHERE p.account_id IS NULL;
