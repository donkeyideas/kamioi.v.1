-- Add permissions JSONB column to users table.
-- NULL = unrestricted (super admin). Non-null = explicit permission map for admin employees.
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;
