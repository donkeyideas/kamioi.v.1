-- Add display_features (user-facing feature bullets) and is_featured (Most Popular badge) to subscription_plans
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS display_features TEXT[],
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Seed display features for existing plans
UPDATE subscription_plans SET
  display_features = ARRAY['Automatic round-ups', 'Basic portfolio', 'AI insights', 'Mobile app', '1 linked card'],
  is_featured = false
WHERE account_type = 'individual';

UPDATE subscription_plans SET
  display_features = ARRAY['Everything in Individual', 'Up to 5 family members', 'Shared goals', 'Family dashboard', 'Priority support', '5 linked cards'],
  is_featured = true
WHERE account_type = 'family';

UPDATE subscription_plans SET
  display_features = ARRAY['Everything in Family', 'Unlimited employees', 'Admin dashboard', 'Compliance reporting', 'API access', 'Dedicated support', 'Unlimited linked cards'],
  is_featured = false
WHERE account_type = 'business';
