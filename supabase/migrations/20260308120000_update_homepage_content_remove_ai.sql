-- Update homepage content: remove AI references, update messaging
-- "We automatically transform your everyday spending into stock ownership"

UPDATE admin_settings SET setting_value = 'Transform Spending into Ownership', updated_at = NOW()
  WHERE setting_key = 'hero_heading';

UPDATE admin_settings SET setting_value = 'Kamioi adds your chosen round-up amount to every purchase and invests it into real stocks. Turn every swipe into a step toward building wealth.', updated_at = NOW()
  WHERE setting_key = 'hero_subheading';

UPDATE admin_settings SET setting_value = 'How your spending builds wealth', updated_at = NOW()
  WHERE setting_key = 'features_heading';

UPDATE admin_settings SET setting_value = 'Smart Stock Matching', updated_at = NOW()
  WHERE setting_key = 'feature_2';

UPDATE admin_settings SET setting_value = 'Your purchases are automatically matched to relevant stocks. Buy coffee, own coffee company shares — your spending drives your portfolio.', updated_at = NOW()
  WHERE setting_key = 'feature_2_desc';

UPDATE admin_settings SET setting_value = 'Set savings goals and track your progress. Your strategy adjusts automatically to help you reach them faster.', updated_at = NOW()
  WHERE setting_key = 'feature_3_desc';

UPDATE admin_settings SET setting_value = 'Auto', updated_at = NOW()
  WHERE setting_key = 'stat_4_value';

UPDATE admin_settings SET setting_value = 'Stock matching', updated_at = NOW()
  WHERE setting_key = 'stat_4_label';

UPDATE admin_settings SET setting_value = 'Micro-investing that transforms your everyday spending into stock ownership.', updated_at = NOW()
  WHERE setting_key = 'footer_tagline';
