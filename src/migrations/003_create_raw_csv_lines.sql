-- Create raw CSV lines table for progressive processing
CREATE TABLE IF NOT EXISTS wheremymoneygoes.raw_csv_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES wheremymoneygoes.users(id) ON DELETE CASCADE,
    upload_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    raw_data TEXT NOT NULL, -- Will be encrypted
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT, -- Will be encrypted if error occurs
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_raw_csv_upload_unprocessed ON wheremymoneygoes.raw_csv_lines(upload_id, processed) 
    WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_raw_csv_user_upload ON wheremymoneygoes.raw_csv_lines(user_id, upload_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_upload_line ON wheremymoneygoes.raw_csv_lines(upload_id, line_number);
