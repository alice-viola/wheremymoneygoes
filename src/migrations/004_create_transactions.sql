-- Create transactions table with encryption
CREATE TABLE IF NOT EXISTS wheremymoneygoes.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES wheremymoneygoes.users(id) ON DELETE CASCADE,
    upload_id UUID NOT NULL,
    raw_line_id UUID REFERENCES wheremymoneygoes.raw_csv_lines(id) ON DELETE CASCADE,
    
    -- Queryable fields (NOT encrypted)
    transaction_date DATE NOT NULL,
    transaction_month VARCHAR(7), -- Will be populated by app code (YYYY-MM format)
    transaction_year INTEGER, -- Will be populated by app code
    kind VARCHAR(1) NOT NULL CHECK (kind IN ('+', '-')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    category VARCHAR(100),
    
    -- Encrypted sensitive data (description, code, subcategory, merchant_name, merchant_type)
    encrypted_data JSONB NOT NULL,
    
    -- Metadata
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON wheremymoneygoes.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_month ON wheremymoneygoes.transactions(user_id, transaction_month);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON wheremymoneygoes.transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_amount ON wheremymoneygoes.transactions(user_id, amount);
CREATE INDEX IF NOT EXISTS idx_transactions_upload ON wheremymoneygoes.transactions(upload_id);
