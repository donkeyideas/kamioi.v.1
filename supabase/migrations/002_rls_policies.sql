-- ============================================================================
-- Migration 002: Row Level Security (RLS) Policies
-- ============================================================================
-- Enables RLS on ALL tables and creates fine-grained access policies.
--
-- Roles: individual, family, business, admin
-- Auth link: users.auth_id -> auth.users(id) via auth.uid()
--
-- Access patterns:
--   - Users see/modify only their OWN data (matched via auth.uid())
--   - Admin users can see/modify ALL data
--   - Some tables are public-read (subscription_plans, advertisements)
--   - contact_messages: public INSERT, admin-only SELECT/UPDATE/DELETE
-- ============================================================================


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get the current user's role (account_type) from the users table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT account_type FROM public.users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get the current user's internal id from the users table
CREATE OR REPLACE FUNCTION public.get_user_id()
RETURNS INT AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if the current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND account_type = 'admin'
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;


-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roundup_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- TABLE: users
-- Users can see and update their own row. Admins can see all rows.
-- Users can insert their own row during registration (auth_id must match).
-- ============================================================================

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth_id = auth.uid() OR public.is_admin());

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth_id = auth.uid() OR public.is_admin())
  WITH CHECK (auth_id = auth.uid() OR public.is_admin());

CREATE POLICY "users_delete_admin"
  ON public.users FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: transactions
-- Users see their own transactions. Admins see all.
-- ============================================================================

CREATE POLICY "transactions_select"
  ON public.transactions FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "transactions_insert"
  ON public.transactions FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "transactions_update"
  ON public.transactions FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "transactions_delete"
  ON public.transactions FOR DELETE
  USING (user_id = public.get_user_id() OR public.is_admin());


-- ============================================================================
-- TABLE: portfolios
-- Users see their own portfolios. Admins see all.
-- ============================================================================

CREATE POLICY "portfolios_select"
  ON public.portfolios FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "portfolios_insert"
  ON public.portfolios FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "portfolios_update"
  ON public.portfolios FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "portfolios_delete"
  ON public.portfolios FOR DELETE
  USING (user_id = public.get_user_id() OR public.is_admin());


-- ============================================================================
-- TABLE: goals
-- Users see their own goals. Admins see all.
-- ============================================================================

CREATE POLICY "goals_select"
  ON public.goals FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "goals_insert"
  ON public.goals FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "goals_update"
  ON public.goals FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "goals_delete"
  ON public.goals FOR DELETE
  USING (user_id = public.get_user_id() OR public.is_admin());


-- ============================================================================
-- TABLE: notifications
-- Users see their own notifications. Admins see all.
-- ============================================================================

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "notifications_delete"
  ON public.notifications FOR DELETE
  USING (user_id = public.get_user_id() OR public.is_admin());


-- ============================================================================
-- TABLE: llm_mappings
-- Users can INSERT (submit a mapping). Admins can SELECT/UPDATE/DELETE.
-- ============================================================================

CREATE POLICY "llm_mappings_select_admin"
  ON public.llm_mappings FOR SELECT
  USING (public.is_admin());

CREATE POLICY "llm_mappings_insert_authenticated"
  ON public.llm_mappings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "llm_mappings_update_admin"
  ON public.llm_mappings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "llm_mappings_delete_admin"
  ON public.llm_mappings FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: ai_responses
-- Admin only: full CRUD.
-- ============================================================================

CREATE POLICY "ai_responses_select_admin"
  ON public.ai_responses FOR SELECT
  USING (public.is_admin());

CREATE POLICY "ai_responses_insert_admin"
  ON public.ai_responses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "ai_responses_update_admin"
  ON public.ai_responses FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "ai_responses_delete_admin"
  ON public.ai_responses FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: roundup_ledger
-- Users see their own ledger entries. Admins see all.
-- ============================================================================

CREATE POLICY "roundup_ledger_select"
  ON public.roundup_ledger FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "roundup_ledger_insert"
  ON public.roundup_ledger FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "roundup_ledger_update"
  ON public.roundup_ledger FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "roundup_ledger_delete"
  ON public.roundup_ledger FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: market_queue
-- Users see their own queued items. Admins see all.
-- ============================================================================

CREATE POLICY "market_queue_select"
  ON public.market_queue FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "market_queue_insert"
  ON public.market_queue FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "market_queue_update"
  ON public.market_queue FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "market_queue_delete"
  ON public.market_queue FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: user_settings
-- Users see their own settings. Admins see all.
-- ============================================================================

CREATE POLICY "user_settings_select"
  ON public.user_settings FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "user_settings_insert"
  ON public.user_settings FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "user_settings_update"
  ON public.user_settings FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "user_settings_delete"
  ON public.user_settings FOR DELETE
  USING (user_id = public.get_user_id() OR public.is_admin());


-- ============================================================================
-- TABLE: admin_settings
-- Public read for specific platform settings (pricing page, feature flags).
-- Only admins can write (INSERT/UPDATE/DELETE).
-- ============================================================================

CREATE POLICY "admin_settings_select_public"
  ON public.admin_settings FOR SELECT
  USING (true);

CREATE POLICY "admin_settings_insert_admin"
  ON public.admin_settings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_settings_update_admin"
  ON public.admin_settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_settings_delete_admin"
  ON public.admin_settings FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: subscription_plans
-- Public SELECT (for pricing page display). Admin-only write operations.
-- ============================================================================

CREATE POLICY "subscription_plans_select_public"
  ON public.subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "subscription_plans_insert_admin"
  ON public.subscription_plans FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "subscription_plans_update_admin"
  ON public.subscription_plans FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "subscription_plans_delete_admin"
  ON public.subscription_plans FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: user_subscriptions
-- Users see their own subscription. Admins see all.
-- ============================================================================

CREATE POLICY "user_subscriptions_select"
  ON public.user_subscriptions FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "user_subscriptions_insert"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "user_subscriptions_update"
  ON public.user_subscriptions FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "user_subscriptions_delete"
  ON public.user_subscriptions FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: renewal_queue
-- Admin only: manages subscription renewal processing.
-- ============================================================================

CREATE POLICY "renewal_queue_select_admin"
  ON public.renewal_queue FOR SELECT
  USING (public.is_admin());

CREATE POLICY "renewal_queue_insert_admin"
  ON public.renewal_queue FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "renewal_queue_update_admin"
  ON public.renewal_queue FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "renewal_queue_delete_admin"
  ON public.renewal_queue FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: renewal_history
-- Admin only: audit trail for subscription renewals.
-- ============================================================================

CREATE POLICY "renewal_history_select_admin"
  ON public.renewal_history FOR SELECT
  USING (public.is_admin());

CREATE POLICY "renewal_history_insert_admin"
  ON public.renewal_history FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "renewal_history_update_admin"
  ON public.renewal_history FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "renewal_history_delete_admin"
  ON public.renewal_history FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: subscription_analytics
-- Admin only: subscription metrics and reporting.
-- ============================================================================

CREATE POLICY "subscription_analytics_select_admin"
  ON public.subscription_analytics FOR SELECT
  USING (public.is_admin());

CREATE POLICY "subscription_analytics_insert_admin"
  ON public.subscription_analytics FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "subscription_analytics_update_admin"
  ON public.subscription_analytics FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "subscription_analytics_delete_admin"
  ON public.subscription_analytics FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: subscription_changes
-- Users see their own plan change history. Admins see all.
-- ============================================================================

CREATE POLICY "subscription_changes_select"
  ON public.subscription_changes FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "subscription_changes_insert"
  ON public.subscription_changes FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "subscription_changes_update"
  ON public.subscription_changes FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "subscription_changes_delete"
  ON public.subscription_changes FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: promo_codes
-- Public SELECT (so users can validate promo codes on the frontend).
-- Admin-only write operations.
-- ============================================================================

CREATE POLICY "promo_codes_select_public"
  ON public.promo_codes FOR SELECT
  USING (true);

CREATE POLICY "promo_codes_insert_admin"
  ON public.promo_codes FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "promo_codes_update_admin"
  ON public.promo_codes FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "promo_codes_delete_admin"
  ON public.promo_codes FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: promo_code_usage
-- Users see their own usage records. Admins see all.
-- ============================================================================

CREATE POLICY "promo_code_usage_select"
  ON public.promo_code_usage FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "promo_code_usage_insert"
  ON public.promo_code_usage FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "promo_code_usage_update_admin"
  ON public.promo_code_usage FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "promo_code_usage_delete_admin"
  ON public.promo_code_usage FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: system_events
-- Admin only: platform-wide event log.
-- ============================================================================

CREATE POLICY "system_events_select_admin"
  ON public.system_events FOR SELECT
  USING (public.is_admin());

CREATE POLICY "system_events_insert_admin"
  ON public.system_events FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "system_events_update_admin"
  ON public.system_events FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "system_events_delete_admin"
  ON public.system_events FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: advertisements
-- Public SELECT (displayed on user dashboards). Admin-only write operations.
-- ============================================================================

CREATE POLICY "advertisements_select_public"
  ON public.advertisements FOR SELECT
  USING (true);

CREATE POLICY "advertisements_insert_admin"
  ON public.advertisements FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "advertisements_update_admin"
  ON public.advertisements FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "advertisements_delete_admin"
  ON public.advertisements FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: statements
-- Users see their own statements. Admins see all.
-- ============================================================================

CREATE POLICY "statements_select"
  ON public.statements FOR SELECT
  USING (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "statements_insert"
  ON public.statements FOR INSERT
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "statements_update"
  ON public.statements FOR UPDATE
  USING (user_id = public.get_user_id() OR public.is_admin())
  WITH CHECK (user_id = public.get_user_id() OR public.is_admin());

CREATE POLICY "statements_delete"
  ON public.statements FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: api_balance
-- Admin only: tracks OpenAI/AI API spend balance.
-- ============================================================================

CREATE POLICY "api_balance_select_admin"
  ON public.api_balance FOR SELECT
  USING (public.is_admin());

CREATE POLICY "api_balance_insert_admin"
  ON public.api_balance FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "api_balance_update_admin"
  ON public.api_balance FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "api_balance_delete_admin"
  ON public.api_balance FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: api_usage
-- Admin only: individual API call logs.
-- ============================================================================

CREATE POLICY "api_usage_select_admin"
  ON public.api_usage FOR SELECT
  USING (public.is_admin());

CREATE POLICY "api_usage_insert_admin"
  ON public.api_usage FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "api_usage_update_admin"
  ON public.api_usage FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "api_usage_delete_admin"
  ON public.api_usage FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- TABLE: contact_messages
-- Public INSERT (anyone can submit a contact form, even unauthenticated).
-- Only admins can SELECT, UPDATE, DELETE.
-- ============================================================================

CREATE POLICY "contact_messages_insert_public"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "contact_messages_select_admin"
  ON public.contact_messages FOR SELECT
  USING (public.is_admin());

CREATE POLICY "contact_messages_update_admin"
  ON public.contact_messages FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "contact_messages_delete_admin"
  ON public.contact_messages FOR DELETE
  USING (public.is_admin());


-- ============================================================================
-- GRANT USAGE
-- ============================================================================
-- Ensure the anon and authenticated roles can execute the helper functions.

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
