-- ============================================================================
-- Deduplicate subscription_plans: keep the latest row per (account_type, tier),
-- delete older duplicates, and add a unique constraint to prevent future dupes.
-- ============================================================================

-- Delete duplicates, keeping only the row with the highest id per (account_type, tier)
DELETE FROM public.subscription_plans
WHERE id NOT IN (
  SELECT MAX(id)
  FROM public.subscription_plans
  GROUP BY account_type, tier
);

-- Add unique constraint to prevent future duplicates (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_subscription_plans_account_type_tier'
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT uq_subscription_plans_account_type_tier UNIQUE (account_type, tier);
  END IF;
END $$;
