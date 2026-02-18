-- ============================================================================
-- Migration 003: Seed Data
-- ============================================================================
-- Inserts initial platform configuration, subscription plans, and API balance.
-- Uses ON CONFLICT to make this migration idempotent (safe to re-run).
-- ============================================================================


-- ============================================================================
-- 1. ADMIN SETTINGS - Default platform configuration
-- ============================================================================

INSERT INTO public.admin_settings (setting_key, setting_value, setting_type, description)
VALUES
  (
    'platform_fee',
    '0.25',
    'decimal',
    'Per-transaction platform fee in dollars'
  ),
  (
    'confidence_threshold',
    '0.90',
    'decimal',
    'Auto-approval confidence threshold for AI merchant-to-ticker mappings'
  ),
  (
    'auto_approval_enabled',
    'true',
    'boolean',
    'Enable auto-approval for high-confidence mappings'
  ),
  (
    'maintenance_mode',
    'false',
    'boolean',
    'Platform maintenance mode - disables user-facing features when true'
  ),
  (
    'daily_api_limit',
    '1000',
    'integer',
    'Daily API call limit for AI processing'
  )
ON CONFLICT (setting_key) DO NOTHING;


-- ============================================================================
-- 2. SUBSCRIPTION PLANS - Individual, Family, Business tiers
-- ============================================================================

INSERT INTO public.subscription_plans (name, account_type, tier, price_monthly, price_yearly, features, is_active)
VALUES
  (
    'Individual',
    'individual',
    'basic',
    9.99,
    99.99,
    '{"personal_investing": true, "round_ups": true, "ai_insights": true, "portfolio_tracking": true, "max_linked_accounts": 2, "monthly_reports": true}',
    true
  ),
  (
    'Family',
    'family',
    'family',
    19.99,
    199.99,
    '{"personal_investing": true, "round_ups": true, "ai_insights": true, "portfolio_tracking": true, "shared_dashboard": true, "member_management": true, "family_budgeting": true, "max_members": 6, "max_linked_accounts": 5, "monthly_reports": true}',
    true
  ),
  (
    'Business',
    'business',
    'business',
    49.99,
    499.99,
    '{"personal_investing": true, "round_ups": true, "ai_insights": true, "portfolio_tracking": true, "shared_dashboard": true, "member_management": true, "family_budgeting": true, "employee_investing": true, "department_tracking": true, "business_analytics": true, "custom_reports": true, "api_access": true, "max_members": 50, "max_linked_accounts": 20, "monthly_reports": true, "quarterly_reports": true}',
    true
  )
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 3. API BALANCE - Initial AI API spending balance
-- ============================================================================
-- Only insert if no balance row exists (first-time setup).

INSERT INTO public.api_balance (balance, updated_at)
SELECT 20.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.api_balance LIMIT 1);
