-- ============================================================================
-- Kamioi Platform - Complete Database Schema Migration
-- Version: 001
-- Date: 2026-02-18
-- Description: Creates all 25 tables for the Kamioi micro-investing platform
-- Compatible with: Supabase (PostgreSQL 15+)
-- ============================================================================

-- ============================================================================
-- UTILITY: updated_at trigger function
-- Automatically sets updated_at to NOW() on any row update
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- TABLE 1: users
-- Core user accounts linked to Supabase Auth
-- ============================================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    auth_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255),
    account_type    VARCHAR(20) DEFAULT 'individual'
                    CHECK (account_type IN ('individual', 'family', 'business', 'admin')),
    account_number  VARCHAR(50),
    user_guid       VARCHAR(100),
    city            VARCHAR(100),
    state           VARCHAR(50),
    zip_code        VARCHAR(20),
    phone           VARCHAR(20),
    round_up_amount DECIMAL(10,2) DEFAULT 1.00,
    subscription_id VARCHAR(100),
    subscription_status VARCHAR(50),
    trial_end_date  TIMESTAMP,
    subscription_tier VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_type ON users(account_type);

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 2: transactions
-- Bank transactions, round-ups, and stock purchases
-- ============================================================================
CREATE TABLE transactions (
    id               SERIAL PRIMARY KEY,
    user_id          INT REFERENCES users(id) ON DELETE CASCADE,
    date             DATE,
    merchant         VARCHAR(255),
    amount           DECIMAL(10,2),
    category         VARCHAR(100),
    description      TEXT,
    investable       BOOLEAN DEFAULT false,
    round_up         DECIMAL(10,2) DEFAULT 0,
    total_debit      DECIMAL(10,2) DEFAULT 0,
    ticker           VARCHAR(10),
    shares           DECIMAL(15,8),
    price_per_share  DECIMAL(10,2),
    stock_price      DECIMAL(10,2),
    status           VARCHAR(20) DEFAULT 'pending'
                     CHECK (status IN ('pending', 'completed', 'failed')),
    fee              DECIMAL(10,2) DEFAULT 0,
    transaction_type VARCHAR(20) DEFAULT 'bank',
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_ticker ON transactions(ticker);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_user_status ON transactions(user_id, status);


-- ============================================================================
-- TABLE 3: portfolios
-- User stock holdings with running totals
-- ============================================================================
CREATE TABLE portfolios (
    id            SERIAL PRIMARY KEY,
    user_id       INT REFERENCES users(id) ON DELETE CASCADE,
    ticker        VARCHAR(10),
    shares        DECIMAL(15,8),
    average_price DECIMAL(10,2),
    current_price DECIMAL(10,2),
    total_value   DECIMAL(12,2),
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_ticker ON portfolios(ticker);
CREATE INDEX idx_portfolios_user_ticker ON portfolios(user_id, ticker);

CREATE TRIGGER trigger_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 4: goals
-- User savings/investment goals
-- ============================================================================
CREATE TABLE goals (
    id             SERIAL PRIMARY KEY,
    user_id        INT REFERENCES users(id) ON DELETE CASCADE,
    title          VARCHAR(255),
    target_amount  DECIMAL(10,2),
    current_amount DECIMAL(10,2) DEFAULT 0,
    progress       DECIMAL(5,2) DEFAULT 0,
    goal_type      VARCHAR(50) DEFAULT 'personal',
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);


-- ============================================================================
-- TABLE 5: notifications
-- User notification inbox
-- ============================================================================
CREATE TABLE notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255),
    message    TEXT,
    type       VARCHAR(20) DEFAULT 'info',
    read       BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);


-- ============================================================================
-- TABLE 6: llm_mappings
-- AI-generated merchant-to-stock ticker mappings
-- ============================================================================
CREATE TABLE llm_mappings (
    id             SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES transactions(id) ON DELETE SET NULL,
    merchant_name  VARCHAR(255),
    ticker         VARCHAR(10),
    category       VARCHAR(100),
    confidence     DECIMAL(5,4),
    status         VARCHAR(20) DEFAULT 'pending',
    admin_approved BOOLEAN,
    ai_processed   BOOLEAN DEFAULT false,
    company_name   VARCHAR(255),
    user_id        INT,
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_llm_mappings_merchant_name ON llm_mappings(merchant_name);
CREATE INDEX idx_llm_mappings_ticker ON llm_mappings(ticker);
CREATE INDEX idx_llm_mappings_category ON llm_mappings(category);
CREATE INDEX idx_llm_mappings_user_id ON llm_mappings(user_id);
CREATE INDEX idx_llm_mappings_status ON llm_mappings(status);
CREATE INDEX idx_llm_mappings_created_at ON llm_mappings(created_at);


-- ============================================================================
-- TABLE 7: ai_responses
-- Full AI request/response audit trail
-- ============================================================================
CREATE TABLE ai_responses (
    id                   SERIAL PRIMARY KEY,
    mapping_id           INT,
    merchant_name        VARCHAR(255),
    category             VARCHAR(100),
    prompt               TEXT,
    raw_response         TEXT,
    parsed_response      TEXT,
    processing_time_ms   INT,
    model_version        VARCHAR(50),
    is_error             BOOLEAN DEFAULT false,
    admin_feedback       TEXT,
    admin_correct_ticker VARCHAR(10),
    was_ai_correct       BOOLEAN,
    feedback_notes       TEXT,
    feedback_date        TIMESTAMP,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_responses_mapping_id ON ai_responses(mapping_id);
CREATE INDEX idx_ai_responses_merchant_name ON ai_responses(merchant_name);
CREATE INDEX idx_ai_responses_category ON ai_responses(category);
CREATE INDEX idx_ai_responses_is_error ON ai_responses(is_error);
CREATE INDEX idx_ai_responses_created_at ON ai_responses(created_at);

CREATE TRIGGER trigger_ai_responses_updated_at
    BEFORE UPDATE ON ai_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 8: roundup_ledger
-- Tracks individual round-up amounts before they are swept into investments
-- ============================================================================
CREATE TABLE roundup_ledger (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    transaction_id  INT REFERENCES transactions(id) ON DELETE SET NULL,
    round_up_amount DECIMAL(10,2),
    fee_amount      DECIMAL(10,2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'pending',
    swept_at        TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_roundup_ledger_user_id ON roundup_ledger(user_id);
CREATE INDEX idx_roundup_ledger_status ON roundup_ledger(status);


-- ============================================================================
-- TABLE 9: market_queue
-- Queued stock purchases waiting for market execution
-- ============================================================================
CREATE TABLE market_queue (
    id             SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES transactions(id) ON DELETE SET NULL,
    user_id        INT REFERENCES users(id) ON DELETE CASCADE,
    ticker         VARCHAR(10),
    amount         DECIMAL(10,2),
    status         VARCHAR(20) DEFAULT 'queued',
    created_at     TIMESTAMP DEFAULT NOW(),
    processed_at   TIMESTAMP
);

CREATE INDEX idx_market_queue_user_id ON market_queue(user_id);
CREATE INDEX idx_market_queue_status ON market_queue(status);
CREATE INDEX idx_market_queue_ticker ON market_queue(ticker);


-- ============================================================================
-- TABLE 10: user_settings
-- Per-user key/value preferences
-- ============================================================================
CREATE TABLE user_settings (
    id            SERIAL PRIMARY KEY,
    user_id       INT REFERENCES users(id) ON DELETE CASCADE,
    setting_key   VARCHAR(100) NOT NULL,
    setting_value TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, setting_key)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 11: admin_settings
-- Global platform configuration (singleton key/value store)
-- ============================================================================
CREATE TABLE admin_settings (
    id            SERIAL PRIMARY KEY,
    setting_key   VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type  VARCHAR(50),
    description   TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trigger_admin_settings_updated_at
    BEFORE UPDATE ON admin_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 12: subscription_plans
-- Available subscription tiers and pricing
-- ============================================================================
CREATE TABLE subscription_plans (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    account_type  VARCHAR(20),
    tier          VARCHAR(50),
    price_monthly DECIMAL(10,2),
    price_yearly  DECIMAL(10,2),
    features      JSONB,
    limits        JSONB,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_account_type ON subscription_plans(account_type);
CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);

CREATE TRIGGER trigger_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 13: user_subscriptions
-- Active user subscription records and billing state
-- ============================================================================
CREATE TABLE user_subscriptions (
    id                      SERIAL PRIMARY KEY,
    user_id                 INT REFERENCES users(id) ON DELETE CASCADE,
    plan_id                 INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
    status                  VARCHAR(20) DEFAULT 'active',
    billing_cycle           VARCHAR(20) DEFAULT 'monthly',
    current_period_start    TIMESTAMP,
    current_period_end      TIMESTAMP,
    next_billing_date       TIMESTAMP,
    amount                  DECIMAL(10,2),
    auto_renewal            BOOLEAN DEFAULT true,
    renewal_attempts        INT DEFAULT 0,
    last_renewal_attempt    TIMESTAMP,
    payment_method_id       VARCHAR(100),
    cancellation_requested_at TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_next_billing ON user_subscriptions(next_billing_date);

CREATE TRIGGER trigger_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 14: renewal_queue
-- Scheduled subscription renewals pending processing
-- ============================================================================
CREATE TABLE renewal_queue (
    id              SERIAL PRIMARY KEY,
    subscription_id INT REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    scheduled_date  DATE,
    status          VARCHAR(20) DEFAULT 'pending',
    attempt_count   INT DEFAULT 0,
    error_message   TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_renewal_queue_subscription_id ON renewal_queue(subscription_id);
CREATE INDEX idx_renewal_queue_status ON renewal_queue(status);
CREATE INDEX idx_renewal_queue_scheduled_date ON renewal_queue(scheduled_date);


-- ============================================================================
-- TABLE 15: renewal_history
-- Historical record of all subscription renewal attempts
-- ============================================================================
CREATE TABLE renewal_history (
    id              SERIAL PRIMARY KEY,
    subscription_id INT REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    renewal_date    TIMESTAMP,
    amount          DECIMAL(10,2),
    status          VARCHAR(20),
    payment_method  VARCHAR(100),
    error_message   TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_renewal_history_subscription_id ON renewal_history(subscription_id);
CREATE INDEX idx_renewal_history_status ON renewal_history(status);


-- ============================================================================
-- TABLE 16: subscription_analytics
-- Aggregated subscription metrics for reporting
-- ============================================================================
CREATE TABLE subscription_analytics (
    id            SERIAL PRIMARY KEY,
    plan_id       INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
    metric_name   VARCHAR(100) NOT NULL,
    metric_value  DECIMAL(12,4),
    date_recorded DATE
);

CREATE INDEX idx_subscription_analytics_plan_id ON subscription_analytics(plan_id);
CREATE INDEX idx_subscription_analytics_metric ON subscription_analytics(metric_name);
CREATE INDEX idx_subscription_analytics_date ON subscription_analytics(date_recorded);


-- ============================================================================
-- TABLE 17: subscription_changes
-- Audit trail for plan upgrades, downgrades, and cancellations
-- ============================================================================
CREATE TABLE subscription_changes (
    id           SERIAL PRIMARY KEY,
    user_id      INT REFERENCES users(id) ON DELETE CASCADE,
    from_plan_id INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
    to_plan_id   INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
    change_type  VARCHAR(50),
    reason       TEXT,
    admin_notes  TEXT,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_changes_user_id ON subscription_changes(user_id);
CREATE INDEX idx_subscription_changes_change_type ON subscription_changes(change_type);


-- ============================================================================
-- TABLE 18: promo_codes
-- Promotional discount codes
-- ============================================================================
CREATE TABLE promo_codes (
    id             SERIAL PRIMARY KEY,
    code           VARCHAR(50) UNIQUE NOT NULL,
    description    TEXT,
    discount_type  VARCHAR(20) DEFAULT 'free_months',
    discount_value DECIMAL(10,2),
    plan_id        INT REFERENCES subscription_plans(id) ON DELETE SET NULL,
    account_type   VARCHAR(20),
    max_uses       INT,
    current_uses   INT DEFAULT 0,
    valid_from     TIMESTAMP,
    valid_until    TIMESTAMP,
    is_active      BOOLEAN DEFAULT true,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_is_active ON promo_codes(is_active);

CREATE TRIGGER trigger_promo_codes_updated_at
    BEFORE UPDATE ON promo_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 19: promo_code_usage
-- Tracks which users redeemed which promo codes
-- ============================================================================
CREATE TABLE promo_code_usage (
    id              SERIAL PRIMARY KEY,
    promo_code_id   INT REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id         INT REFERENCES users(id) ON DELETE CASCADE,
    subscription_id INT REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    used_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promo_code_usage_promo_code_id ON promo_code_usage(promo_code_id);
CREATE INDEX idx_promo_code_usage_user_id ON promo_code_usage(user_id);


-- ============================================================================
-- TABLE 20: system_events
-- Platform-wide event log for auditing and debugging
-- ============================================================================
CREATE TABLE system_events (
    id             SERIAL PRIMARY KEY,
    event_type     VARCHAR(100) NOT NULL,
    tenant_id      VARCHAR(100),
    tenant_type    VARCHAR(50),
    data           JSONB,
    correlation_id VARCHAR(100),
    source         VARCHAR(100),
    created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_events_event_type ON system_events(event_type);
CREATE INDEX idx_system_events_tenant_id ON system_events(tenant_id);
CREATE INDEX idx_system_events_correlation_id ON system_events(correlation_id);
CREATE INDEX idx_system_events_created_at ON system_events(created_at DESC);


-- ============================================================================
-- TABLE 21: advertisements
-- Promotional banners displayed on user dashboards
-- ============================================================================
CREATE TABLE advertisements (
    id                SERIAL PRIMARY KEY,
    title             VARCHAR(255),
    subtitle          VARCHAR(255),
    description       TEXT,
    offer             VARCHAR(255),
    button_text       VARCHAR(100),
    link              VARCHAR(500),
    gradient          VARCHAR(255),
    target_dashboards VARCHAR(100) DEFAULT 'user,family',
    start_date        DATE,
    end_date          DATE,
    is_active         BOOLEAN DEFAULT true,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_advertisements_is_active ON advertisements(is_active);
CREATE INDEX idx_advertisements_dates ON advertisements(start_date, end_date);

CREATE TRIGGER trigger_advertisements_updated_at
    BEFORE UPDATE ON advertisements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TABLE 22: statements
-- Generated account statements (PDF downloads)
-- ============================================================================
CREATE TABLE statements (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50),
    period     VARCHAR(50),
    date       DATE,
    size       VARCHAR(20),
    format     VARCHAR(10) DEFAULT 'PDF',
    file_path  TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_statements_user_id ON statements(user_id);
CREATE INDEX idx_statements_date ON statements(date);


-- ============================================================================
-- TABLE 23: api_balance
-- Singleton table tracking remaining AI API credit balance
-- ============================================================================
CREATE TABLE api_balance (
    id         SERIAL PRIMARY KEY,
    balance    DECIMAL(10,2) DEFAULT 20.00,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trigger_api_balance_updated_at
    BEFORE UPDATE ON api_balance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed with a single row so balance always exists
INSERT INTO api_balance (balance) VALUES (20.00);


-- ============================================================================
-- TABLE 24: api_usage
-- Per-request AI API usage log with cost tracking
-- ============================================================================
CREATE TABLE api_usage (
    id                SERIAL PRIMARY KEY,
    endpoint          VARCHAR(255),
    model             VARCHAR(100),
    prompt_tokens     INT,
    completion_tokens INT,
    total_tokens      INT,
    processing_time_ms INT,
    cost              DECIMAL(10,6),
    success           BOOLEAN DEFAULT true,
    error_message     TEXT,
    request_data      TEXT,
    response_data     TEXT,
    user_id           INT,
    page_tab          VARCHAR(100),
    created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_usage_model_created ON api_usage(model, created_at);
CREATE INDEX idx_api_usage_success_created ON api_usage(success, created_at);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at DESC);


-- ============================================================================
-- TABLE 25: contact_messages
-- Public contact form submissions
-- ============================================================================
CREATE TABLE contact_messages (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255),
    email      VARCHAR(255),
    subject    VARCHAR(255),
    message    TEXT,
    status     VARCHAR(20) DEFAULT 'unread',
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contact_messages_status ON contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);


-- ============================================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all 25 tables. Policies are defined separately per environment.
-- ============================================================================
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_mappings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE roundup_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_queue         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_balance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages     ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables created:  25
-- Indexes created: 60+
-- Triggers:        10 (updated_at auto-refresh)
-- RLS enabled:     All 25 tables
-- Seed data:       api_balance (1 row with $20.00 default)
-- ============================================================================
