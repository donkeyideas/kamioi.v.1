-- Seed initial content for About, Contact, Features, Pricing, and How It Works pages
-- All stored in admin_settings with setting_type='content'

INSERT INTO admin_settings (setting_type, setting_key, setting_value, description)
VALUES
-- About page
('content', 'about_hero_title', 'About Kamioi', 'About page hero title'),
('content', 'about_hero_subtitle', 'We believe that everyone deserves the opportunity to build wealth — one purchase at a time.', 'About page hero subtitle'),
('content', 'about_mission_title', 'Our Mission', 'About page mission section title'),
('content', 'about_mission_desc', 'Kamioi was built on a simple idea: the money you spend every day can also be the money that builds your future. We created a platform where every purchase automatically invests a fixed dollar amount you choose into real stocks — turning routine transactions into long-term wealth.', 'About page mission description'),
('content', 'about_values_title', 'Our Values', 'About page values section title'),
('content', 'about_value_1_title', 'Transparency', 'About page value 1 title'),
('content', 'about_value_1_desc', 'No hidden fees, no fine print. You always know exactly what you are paying and where your money is going.', 'About page value 1 description'),
('content', 'about_value_2_title', 'Accessibility', 'About page value 2 title'),
('content', 'about_value_2_desc', 'Investing should not require a minimum balance or a finance degree. We make it simple for everyone — individuals, families, and businesses.', 'About page value 2 description'),
('content', 'about_value_3_title', 'Security', 'About page value 3 title'),
('content', 'about_value_3_desc', 'Your data and investments are protected with bank-level 256-bit AES encryption, two-factor authentication, and regular security audits.', 'About page value 3 description'),
('content', 'about_history_title', 'How It Started', 'About page history section title'),
('content', 'about_history_p1', 'Kamioi started with a question: why does investing feel so separate from spending? We set out to bridge that gap — creating a platform where your purchases naturally flow into investments, with no extra effort required.', 'About page history paragraph 1'),
('content', 'about_history_p2', 'Today, Kamioi serves individual investors, families, and businesses with a system that turns every transaction into a step toward financial growth.', 'About page history paragraph 2'),
('content', 'about_cta_title', 'Ready to start?', 'About page CTA title'),
('content', 'about_cta_subtitle', 'Join Kamioi and turn your everyday spending into ownership.', 'About page CTA subtitle'),
('content', 'about_cta_primary', 'Create Free Account', 'About page CTA primary button'),
('content', 'about_cta_secondary', 'Contact Us', 'About page CTA secondary button'),

-- Contact page
('content', 'contact_hero_title', 'Contact Us', 'Contact page hero title'),
('content', 'contact_hero_subtitle', 'Have a question or feedback? We would love to hear from you.', 'Contact page hero subtitle'),
('content', 'contact_demo_title', 'Request a Demo', 'Contact page demo variant title'),
('content', 'contact_demo_subtitle', 'Fill out the form below and our team will get you set up with demo access.', 'Contact page demo variant subtitle'),
('content', 'contact_submit_text', 'Send Message', 'Contact page submit button text'),
('content', 'contact_demo_submit', 'Submit Demo Request', 'Contact page demo submit button text'),
('content', 'contact_success', 'Message sent successfully. We will get back to you soon.', 'Contact page success message'),
('content', 'contact_demo_success', 'Demo request submitted! Our team will review and send you access shortly.', 'Contact page demo success message'),
('content', 'contact_info_title', 'Get in touch', 'Contact page info card title'),
('content', 'contact_email', 'info@donkeyideas.com', 'Contact page email address'),
('content', 'contact_response', 'We typically respond within 24 hours', 'Contact page response time'),
('content', 'contact_hours', 'Monday - Friday, 9am - 6pm EST', 'Contact page office hours'),
('content', 'contact_support_title', 'Looking for support?', 'Contact page support card title'),
('content', 'contact_support_desc', 'Check out our frequently asked questions for quick answers.', 'Contact page support card description'),

-- Features page
('content', 'feat_hero_title', 'Everything you need to invest smarter', 'Features page hero title'),
('content', 'feat_hero_subtitle', 'Kamioi combines automatic round-ups, AI-powered insights, and goal-based investing into one platform.', 'Features page hero subtitle'),
('content', 'feat_1_title', 'Automatic Round-Ups', 'Features page feature 1 title'),
('content', 'feat_1_desc', 'Choose a whole-dollar round-up amount — $1, $2, $3, or more. Every purchase automatically invests that amount into your portfolio.', 'Features page feature 1 description'),
('content', 'feat_2_title', 'AI Investment Engine', 'Features page feature 2 title'),
('content', 'feat_2_desc', 'Machine learning algorithms analyze market trends and your risk profile to optimize your portfolio allocation.', 'Features page feature 2 description'),
('content', 'feat_3_title', 'Goal Tracking', 'Features page feature 3 title'),
('content', 'feat_3_desc', 'Set financial goals with target amounts and dates. Track progress with visual dashboards and milestone celebrations.', 'Features page feature 3 description'),
('content', 'feat_4_title', 'Family Plans', 'Features page feature 4 title'),
('content', 'feat_4_desc', 'Manage family investments together. Parents can oversee children''s accounts and set spending limits.', 'Features page feature 4 description'),
('content', 'feat_5_title', 'Business Accounts', 'Features page feature 5 title'),
('content', 'feat_5_desc', 'Employee benefit programs with round-up investing. Manage team accounts and generate compliance reports.', 'Features page feature 5 description'),
('content', 'feat_6_title', 'Real-Time Analytics', 'Features page feature 6 title'),
('content', 'feat_6_desc', 'Track your portfolio performance, spending patterns, and investment growth with live dashboards.', 'Features page feature 6 description'),
('content', 'feat_cta_title', 'Ready to get started?', 'Features page CTA title'),
('content', 'feat_cta_button', 'Create Free Account', 'Features page CTA button text'),

-- Pricing page
('content', 'price_hero_title', 'Simple, transparent pricing', 'Pricing page hero title'),
('content', 'price_hero_subtitle', 'No hidden fees. No surprises. Choose the plan that fits your needs.', 'Pricing page hero subtitle'),
('content', 'price_footer_note', 'All plans include: Bank-level security · SIPC insurance · Cancel anytime', 'Pricing page footer note'),

-- How It Works page
('content', 'hiw_hero_title', 'How Kamioi works', 'How It Works page hero title'),
('content', 'hiw_hero_subtitle', 'Three simple steps to start building wealth with your everyday purchases.', 'How It Works page hero subtitle'),
('content', 'hiw_step_1_title', 'Sign Up & Connect', 'How It Works step 1 title'),
('content', 'hiw_step_1_desc', 'Create your account in under 60 seconds. Link your bank cards through our secure connection. We use bank-level encryption to protect your data.', 'How It Works step 1 description'),
('content', 'hiw_step_2_title', 'Round Up & Invest', 'How It Works step 2 title'),
('content', 'hiw_step_2_desc', 'Every time you make a purchase, we add your chosen round-up amount — $1, $2, $3, or more. That fixed amount is invested into diversified ETF portfolios matched to your risk profile.', 'How It Works step 2 description'),
('content', 'hiw_step_3_title', 'Track & Grow', 'How It Works step 3 title'),
('content', 'hiw_step_3_desc', 'Watch your portfolio grow in real-time. Get AI-powered insights and recommendations. Set goals and celebrate milestones as you build wealth.', 'How It Works step 3 description'),
('content', 'hiw_example_title', 'See it in action', 'How It Works example section title'),
('content', 'hiw_example_desc', 'You buy a coffee for $3.75. With a $1 round-up setting, Kamioi invests $1.00 automatically. Over time, these consistent amounts compound into significant wealth.', 'How It Works example description'),
('content', 'hiw_cta_button', 'Start investing today', 'How It Works CTA button text')

ON CONFLICT (setting_key) DO NOTHING;
