-- Create wheremymoneygoes schema if not exists
CREATE SCHEMA IF NOT EXISTS wheremymoneygoes;

-- Create users table with authentication
CREATE TABLE IF NOT EXISTS wheremymoneygoes.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON wheremymoneygoes.users(email);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION wheremymoneygoes.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON wheremymoneygoes.users
    FOR EACH ROW
    EXECUTE FUNCTION wheremymoneygoes.update_updated_at_column();
