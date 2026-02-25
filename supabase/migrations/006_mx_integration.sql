-- ============================================================================
-- Kamioi Platform - Teller Bank Integration
-- Version: 006
-- Date: 2026-02-23
-- Description: Tables for Teller bank aggregation (enrollments, accounts, category map)
-- ============================================================================

-- ============================================================================
-- TABLE: teller_enrollments
-- Tracks linked bank connections per user via Teller
-- Each enrollment = one bank link, contains an access_token for API calls
-- ============================================================================
CREATE TABLE teller_enrollments (
    id                SERIAL PRIMARY KEY,
    user_id           INT REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id     VARCHAR(100) UNIQUE NOT NULL,
    access_token      VARCHAR(255) NOT NULL,
    institution_name  VARCHAR(255),
    institution_id    VARCHAR(100),
    is_active         BOOLEAN DEFAULT true,
    last_synced_at    TIMESTAMP,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_teller_enrollments_user_id ON teller_enrollments(user_id);
CREATE INDEX idx_teller_enrollments_enrollment_id ON teller_enrollments(enrollment_id);

CREATE TRIGGER trigger_teller_enrollments_updated_at
    BEFORE UPDATE ON teller_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE: teller_accounts
-- Bank/credit card accounts under each Teller enrollment
-- ============================================================================
CREATE TABLE teller_accounts (
    id                  SERIAL PRIMARY KEY,
    enrollment_id       INT REFERENCES teller_enrollments(id) ON DELETE CASCADE,
    user_id             INT REFERENCES users(id) ON DELETE CASCADE,
    teller_account_id   VARCHAR(100) UNIQUE NOT NULL,
    account_name        VARCHAR(255),
    account_type        VARCHAR(50),
    account_subtype     VARCHAR(50),
    balance_available   DECIMAL(12,2),
    balance_ledger      DECIMAL(12,2),
    institution_name    VARCHAR(255),
    last_four           VARCHAR(4),
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_teller_accounts_user_id ON teller_accounts(user_id);
CREATE INDEX idx_teller_accounts_enrollment_id ON teller_accounts(enrollment_id);
CREATE INDEX idx_teller_accounts_teller_id ON teller_accounts(teller_account_id);

CREATE TRIGGER trigger_teller_accounts_updated_at
    BEFORE UPDATE ON teller_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE: category_map
-- Maps bank transaction categories to Kamioi's 9 categories
-- ============================================================================
CREATE TABLE category_map (
    id               SERIAL PRIMARY KEY,
    source_category  VARCHAR(100) NOT NULL,
    kamioi_category  VARCHAR(50) NOT NULL
);

CREATE INDEX idx_category_map_source ON category_map(source_category);

-- Seed category mappings (Teller uses categories like "accommodation", "advertising", etc.)
INSERT INTO category_map (source_category, kamioi_category) VALUES
  -- Food & Drink
  ('bar', 'Food & Drink'),
  ('dining', 'Food & Drink'),
  ('restaurant', 'Food & Drink'),
  ('coffee', 'Food & Drink'),
  ('fast food', 'Food & Drink'),
  ('food and drink', 'Food & Drink'),
  ('bakery', 'Food & Drink'),
  -- Shopping
  ('clothing', 'Shopping'),
  ('department store', 'Shopping'),
  ('shopping', 'Shopping'),
  ('general merchandise', 'Shopping'),
  ('sporting goods', 'Shopping'),
  ('books', 'Shopping'),
  ('pets', 'Shopping'),
  ('gifts', 'Shopping'),
  ('online shopping', 'Shopping'),
  -- Gas
  ('gas', 'Gas'),
  ('fuel', 'Gas'),
  ('gas station', 'Gas'),
  -- Groceries
  ('groceries', 'Groceries'),
  ('supermarket', 'Groceries'),
  -- Transportation
  ('transportation', 'Transportation'),
  ('ride share', 'Transportation'),
  ('taxi', 'Transportation'),
  ('parking', 'Transportation'),
  ('public transit', 'Transportation'),
  ('car', 'Transportation'),
  ('auto', 'Transportation'),
  -- Entertainment
  ('entertainment', 'Entertainment'),
  ('streaming', 'Entertainment'),
  ('movies', 'Entertainment'),
  ('music', 'Entertainment'),
  ('gaming', 'Entertainment'),
  ('arts', 'Entertainment'),
  -- Health
  ('health', 'Health'),
  ('pharmacy', 'Health'),
  ('doctor', 'Health'),
  ('hospital', 'Health'),
  ('gym', 'Health'),
  ('fitness', 'Health'),
  ('dentist', 'Health'),
  -- Home
  ('rent', 'Home'),
  ('mortgage', 'Home'),
  ('home improvement', 'Home'),
  ('utilities', 'Home'),
  ('home', 'Home'),
  ('internet', 'Home'),
  ('phone', 'Home'),
  ('accommodation', 'Home'),
  ('insurance', 'Home'),
  -- Electronics
  ('electronics', 'Electronics'),
  ('computer', 'Electronics'),
  ('software', 'Electronics');


-- ============================================================================
-- ALTER: transactions table — add Teller tracking columns
-- ============================================================================
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS teller_transaction_id VARCHAR(100) UNIQUE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS teller_account_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_transactions_teller_id ON transactions(teller_transaction_id);


-- ============================================================================
-- RLS: Enable on new tables
-- ============================================================================
ALTER TABLE teller_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teller_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_map       ENABLE ROW LEVEL SECURITY;

-- category_map is read-only reference data, allow public read
CREATE POLICY category_map_public_read ON category_map
    FOR SELECT USING (true);
