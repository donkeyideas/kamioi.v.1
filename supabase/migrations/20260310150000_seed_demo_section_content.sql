-- Seed demo request section content for the homepage
INSERT INTO admin_settings (setting_type, setting_key, setting_value, description)
VALUES
('content', 'demo_section_heading', 'Request a Demo', 'Homepage demo request section heading'),
('content', 'demo_section_subtext', 'See Kamioi in action. Fill out the form below and our team will set you up with demo access.', 'Homepage demo request section subtext')
ON CONFLICT (setting_key) DO NOTHING;
