-- Create accounts table for multi-account support
CREATE TABLE IF NOT EXISTS wheremymoneygoes.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES wheremymoneygoes.users(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) DEFAULT 'checking', -- 'checking', 'savings', 'credit', 'investment', 'cash', 'other'
    bank_name VARCHAR(255),
    account_number_last4 VARCHAR(4), -- Last 4 digits for identification (encrypted)
    currency VARCHAR(3) DEFAULT 'EUR',
    color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color for UI
    icon VARCHAR(50) DEFAULT 'BuildingLibraryIcon', -- Icon identifier
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    balance DECIMAL(12, 2) DEFAULT 0, -- Optional current balance tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user ON wheremymoneygoes.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_active ON wheremymoneygoes.accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_accounts_user_default ON wheremymoneygoes.accounts(user_id, is_default);

-- Ensure only one default account per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_default_account 
ON wheremymoneygoes.accounts(user_id, is_default) 
WHERE is_default = true;

-- Create default accounts for existing users
INSERT INTO wheremymoneygoes.accounts (user_id, account_name, account_type, is_default, is_active, color, icon)
SELECT 
    id as user_id,
    'Main Account' as account_name,
    'checking' as account_type,
    true as is_default,
    true as is_active,
    '#3b82f6' as color,
    'BuildingLibraryIcon' as icon
FROM wheremymoneygoes.users
WHERE NOT EXISTS (
    SELECT 1 FROM wheremymoneygoes.accounts a WHERE a.user_id = wheremymoneygoes.users.id
);
