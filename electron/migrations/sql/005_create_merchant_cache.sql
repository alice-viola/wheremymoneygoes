-- Create merchant_cache table for AI-learned categorizations
CREATE TABLE IF NOT EXISTS merchant_cache (
    merchant TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_merchant_cache_category 
ON merchant_cache(category);

CREATE INDEX IF NOT EXISTS idx_merchant_cache_usage 
ON merchant_cache(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_cache_last_used 
ON merchant_cache(last_used DESC);
