-- Create processing queue table for batch management
CREATE TABLE IF NOT EXISTS wheremymoneygoes.processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES wheremymoneygoes.users(id) ON DELETE CASCADE,
    upload_id UUID NOT NULL,
    batch_start INTEGER NOT NULL,
    batch_end INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    attempts INTEGER DEFAULT 0,
    error_message TEXT, -- Will be encrypted
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for queue management
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON wheremymoneygoes.processing_queue(status) 
    WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_processing_queue_upload_status ON wheremymoneygoes.processing_queue(upload_id, status);
