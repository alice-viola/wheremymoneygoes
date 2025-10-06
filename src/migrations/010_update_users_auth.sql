-- Update users table for authentication
-- Add email and password_hash columns, remove username unique constraint

-- First, drop the existing username index if it exists
DROP INDEX IF EXISTS wheremymoneygoes.idx_users_username;

-- Add new columns if they don't exist
ALTER TABLE wheremymoneygoes.users 
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Make username nullable and remove unique constraint
ALTER TABLE wheremymoneygoes.users 
  ALTER COLUMN username DROP NOT NULL;

-- Update existing test users to have email and temporary password
UPDATE wheremymoneygoes.users 
SET 
  email = username || '@example.com',
  password_hash = '$2b$10$YourHashedPasswordHere' -- This is a placeholder, users will need to reset
WHERE email IS NULL;

-- Now make email required and unique
ALTER TABLE wheremymoneygoes.users 
  ALTER COLUMN email SET NOT NULL,
  ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Make password_hash required
ALTER TABLE wheremymoneygoes.users 
  ALTER COLUMN password_hash SET NOT NULL;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON wheremymoneygoes.users(email);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION wheremymoneygoes.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS update_users_updated_at ON wheremymoneygoes.users;

-- Create trigger
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON wheremymoneygoes.users
    FOR EACH ROW
    EXECUTE FUNCTION wheremymoneygoes.update_updated_at_column();
