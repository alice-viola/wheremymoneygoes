-- Create uploads table
CREATE TABLE IF NOT EXISTS wheremymoneygoes.uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES wheremymoneygoes.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL, -- Will be encrypted
    original_filename TEXT, -- Will be encrypted
    file_size INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, partial
    separator VARCHAR(5),
    field_mappings JSONB, -- Will be encrypted
    total_lines INTEGER,
    processed_lines INTEGER DEFAULT 0,
    failed_lines INTEGER DEFAULT 0,
    error_message TEXT, -- Will be encrypted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_uploads_user_status ON wheremymoneygoes.uploads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_uploads_user_date ON wheremymoneygoes.uploads(user_id, created_at DESC);
