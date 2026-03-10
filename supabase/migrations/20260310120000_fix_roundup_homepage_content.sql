-- Fix round-up descriptions in admin_settings homepage content (DB may have old "spare change" text)
UPDATE admin_settings SET setting_value = 'Choose a whole-dollar round-up amount — $1, $2, $3, or more. Every purchase automatically invests that amount into your portfolio.'
WHERE setting_key = 'feature_1_desc' AND setting_type = 'content';

UPDATE admin_settings SET setting_value = 'Kamioi adds your chosen round-up amount to every purchase and invests it into real stocks matched to the brands you buy.'
WHERE setting_key = 'hero_subheading' AND setting_type = 'content';

UPDATE admin_settings SET setting_value = 'Your round-up is invested into stocks matched to the brands you buy.'
WHERE setting_key = 'step_3_desc' AND setting_type = 'content';

UPDATE admin_settings SET setting_value = 'Start investing with every purchase. Choose your round-up amount and watch your portfolio grow.'
WHERE setting_key = 'cta_subtext' AND setting_type = 'content';
