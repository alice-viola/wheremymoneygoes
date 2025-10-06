-- Create raw_csv_lines table for storing original CSV data
CREATE TABLE IF NOT EXISTS raw_csv_lines (
    id TEXT PRIMARY KEY,
    upload_id TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    raw_data TEXT NOT NULL,
    parsed_data TEXT, -- JSON representation
    is_processed INTEGER DEFAULT 0, -- Boolean
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_raw_csv_upload 
ON raw_csv_lines(upload_id);

CREATE INDEX IF NOT EXISTS idx_raw_csv_processed 
ON raw_csv_lines(is_processed);

-- Unique constraint to prevent duplicate lines
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_csv_unique 
ON raw_csv_lines(upload_id, line_number);
