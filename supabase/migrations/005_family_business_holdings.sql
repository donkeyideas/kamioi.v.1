-- ============================================================================
-- Migration 005: Families, Businesses, and Holdings View
-- ============================================================================
-- Creates the family/business relationship tables and a holdings view
-- that maps to the existing portfolios table.
-- ============================================================================


-- ============================================================================
-- TABLE: families
-- Family groups that aggregate multiple user accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS families (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_by  INT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_created_by ON families(created_by);

CREATE TRIGGER trigger_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE: family_members
-- Links users to families with roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS family_members (
    id          SERIAL PRIMARY KEY,
    family_id   INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) DEFAULT 'member'
                CHECK (role IN ('owner', 'parent', 'member', 'child')),
    status      VARCHAR(20) DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'pending')),
    joined_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);


-- ============================================================================
-- TABLE: businesses
-- Business/company accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS businesses (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_by  INT REFERENCES users(id) ON DELETE SET NULL,
    industry    VARCHAR(100),
    size        VARCHAR(50),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON businesses(created_by);

CREATE TRIGGER trigger_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE: business_members
-- Links users to businesses with roles and departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_members (
    id            SERIAL PRIMARY KEY,
    business_id   INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role          VARCHAR(20) DEFAULT 'employee'
                  CHECK (role IN ('admin', 'manager', 'employee')),
    department    VARCHAR(100),
    status        VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'pending')),
    joined_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON business_members(user_id);


-- ============================================================================
-- VIEW: holdings
-- Maps to portfolios table for components that query "holdings"
-- ============================================================================
CREATE OR REPLACE VIEW holdings AS
SELECT
    id,
    user_id,
    ticker,
    shares,
    average_price AS avg_price,
    current_price,
    total_value,
    created_at,
    updated_at
FROM portfolios;


-- ============================================================================
-- SEED: Create family + business for test user (user_id = 1)
-- ============================================================================

-- Create a family for user 1
INSERT INTO families (id, name, created_by)
VALUES (1, 'Rivera Family', 1)
ON CONFLICT (id) DO NOTHING;

-- Add user 1 as family owner
INSERT INTO family_members (family_id, user_id, role, status)
VALUES (1, 1, 'owner', 'active')
ON CONFLICT (family_id, user_id) DO NOTHING;

-- Create a business for user 1
INSERT INTO businesses (id, name, created_by, industry, size)
VALUES (1, 'Rivera Ventures', 1, 'Technology', 'Small')
ON CONFLICT (id) DO NOTHING;

-- Add user 1 as business admin
INSERT INTO business_members (business_id, user_id, role, department, status)
VALUES (1, 1, 'admin', 'Engineering', 'active')
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Reset sequences to avoid conflicts with future inserts
SELECT setval('families_id_seq', GREATEST((SELECT MAX(id) FROM families), 1));
SELECT setval('businesses_id_seq', GREATEST((SELECT MAX(id) FROM businesses), 1));
