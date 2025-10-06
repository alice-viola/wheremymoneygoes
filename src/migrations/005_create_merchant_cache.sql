-- Create per-user merchant cache table
CREATE TABLE IF NOT EXISTS wheremymoneygoes.merchant_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES wheremymoneygoes.users(id) ON DELETE CASCADE,
    merchant_key TEXT NOT NULL, -- Will be encrypted
    category VARCHAR(100) NOT NULL, -- Unencrypted for queries
    encrypted_data JSONB NOT NULL, -- Contains: subcategory, merchant_name, merchant_type
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique per user merchant key
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_merchant ON wheremymoneygoes.merchant_cache(user_id, merchant_key);
CREATE INDEX IF NOT EXISTS idx_merchant_cache_user_category ON wheremymoneygoes.merchant_cache(user_id, category);
