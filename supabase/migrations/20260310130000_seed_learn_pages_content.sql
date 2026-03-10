-- Seed initial content for Getting Started, FAQ, Security, and API Docs pages
-- All stored in admin_settings with setting_type='content' (same as homepage content)

INSERT INTO admin_settings (setting_type, setting_key, setting_value, description)
VALUES
-- Getting Started page
('content', 'gs_hero_title', 'Getting Started', 'Getting Started page hero title'),
('content', 'gs_hero_subtitle', 'Start investing in under two minutes. No minimum balance, no experience needed.', 'Getting Started page hero subtitle'),
('content', 'gs_step_1_title', 'Create Your Account', 'Getting Started step 1 title'),
('content', 'gs_step_1_desc', 'Sign up with your email and choose a plan that fits your needs — Individual, Family, or Business. Verification takes less than a minute.', 'Getting Started step 1 description'),
('content', 'gs_step_2_title', 'Link Your Bank', 'Getting Started step 2 title'),
('content', 'gs_step_2_desc', 'Securely connect your checking account or debit card. We use bank-level 256-bit encryption and never store your credentials.', 'Getting Started step 2 description'),
('content', 'gs_step_3_title', 'Set Your Round-Up Amount', 'Getting Started step 3 title'),
('content', 'gs_step_3_desc', 'Choose a whole-dollar amount — $1, $2, $3, or more — to invest with every purchase. You can change this anytime from your dashboard.', 'Getting Started step 3 description'),
('content', 'gs_next_title', 'What Happens Next', 'Getting Started next section title'),
('content', 'gs_next_desc', 'Every time you make a purchase, Kamioi automatically adds your chosen round-up amount and invests it into real stocks matched to the brands you buy. Your portfolio grows with every transaction — no extra effort required.', 'Getting Started next section description'),
('content', 'gs_cta_heading', 'Ready to start building wealth?', 'Getting Started CTA heading'),
('content', 'gs_cta_subtext', 'Create your free account and make your first investment today.', 'Getting Started CTA subtext'),

-- FAQ page
('content', 'faq_hero_title', 'Frequently Asked Questions', 'FAQ page hero title'),
('content', 'faq_hero_subtitle', 'Everything you need to know about Kamioi. Can''t find what you''re looking for? Contact our support team.', 'FAQ page hero subtitle'),
('content', 'faq_q1', 'What is round-up investing?', 'FAQ question 1'),
('content', 'faq_a1', 'Round-up investing adds a fixed whole-dollar amount you choose — like $1, $2, or $3 — to every purchase and invests it automatically. For example, if you set your round-up to $1 and buy a coffee for $3.75, Kamioi invests $1.00 into your portfolio. Over time, these consistent amounts accumulate and compound, helping you build wealth without changing your spending habits.', 'FAQ answer 1'),
('content', 'faq_q2', 'Is my money safe?', 'FAQ question 2'),
('content', 'faq_a2', 'Yes. Your investments are held in SIPC-insured accounts, which protect securities customers up to $500,000 (including $250,000 for cash claims). We use bank-level 256-bit AES encryption, two-factor authentication, and regular security audits to safeguard your account and personal information.', 'FAQ answer 2'),
('content', 'faq_q3', 'What are the fees?', 'FAQ question 3'),
('content', 'faq_a3', 'Kamioi charges a simple flat monthly fee based on your plan. Our Individual plan is great for solo investors, Family plans let you invest together, and Business accounts have enterprise features. There are no hidden fees, no trading commissions, and no withdrawal penalties.', 'FAQ answer 3'),
('content', 'faq_q4', 'Can I withdraw my money?', 'FAQ question 4'),
('content', 'faq_a4', 'Yes, you can withdraw your funds at any time with no penalties or lock-up periods. Standard withdrawals typically arrive in your bank account within 3-5 business days. We believe your money should always be accessible when you need it.', 'FAQ answer 4'),
('content', 'faq_q5', 'How does the AI work?', 'FAQ question 5'),
('content', 'faq_a5', 'Our AI analyzes your spending patterns to match purchases with relevant stocks. Buy coffee at Starbucks, and your round-up goes toward Starbucks stock. The system continuously monitors your portfolio and provides personalized insights to help you make informed investment decisions.', 'FAQ answer 5'),
('content', 'faq_q6', 'How do I link my bank account?', 'FAQ question 6'),
('content', 'faq_a6', 'After creating your account, go to Settings and click "Link Bank Account." We use secure bank-level connections to verify your account. Your banking credentials are never stored on our servers — they are processed through encrypted, tokenized connections.', 'FAQ answer 6'),
('content', 'faq_q7', 'Can I change my round-up amount?', 'FAQ question 7'),
('content', 'faq_a7', 'Absolutely. You can change your round-up amount at any time from your dashboard settings. Choose any whole-dollar amount — $1, $2, $3, or more. Changes take effect on your next purchase.', 'FAQ answer 7'),
('content', 'faq_q8', 'What stocks will I own?', 'FAQ question 8'),
('content', 'faq_a8', 'Kamioi matches your purchases to relevant publicly traded companies. When you buy from a brand, your round-up is invested in that company''s stock. You own real fractional shares in your portfolio, and you can view your holdings anytime from your dashboard.', 'FAQ answer 8'),

-- Security page
('content', 'sec_hero_title', 'Security & Privacy', 'Security page hero title'),
('content', 'sec_hero_subtitle', 'Your money and data are protected by the same security standards used by major banks and financial institutions.', 'Security page hero subtitle'),
('content', 'sec_card_1_title', 'Bank-Level Encryption', 'Security card 1 title'),
('content', 'sec_card_1_desc', 'All data is encrypted with 256-bit AES encryption at rest and TLS 1.3 in transit. Your financial information is protected by the same standards used by the world''s largest banks.', 'Security card 1 description'),
('content', 'sec_card_2_title', 'Multi-Factor Authentication', 'Security card 2 title'),
('content', 'sec_card_2_desc', 'Secure your account with two-factor authentication, biometric login on mobile devices, and automatic session management that locks inactive accounts.', 'Security card 2 description'),
('content', 'sec_card_3_title', 'Regulatory Compliance', 'Security card 3 title'),
('content', 'sec_card_3_desc', 'Your investments are held in SIPC-insured accounts protecting up to $500,000. We undergo regular third-party security audits and comply with SOC 2 Type II standards.', 'Security card 3 description'),
('content', 'sec_privacy_title', 'Your Data, Your Control', 'Security privacy section title'),
('content', 'sec_privacy_desc', 'We never sell your personal data to third parties. Your financial information is used solely to provide and improve your investment experience. You can request a full export or deletion of your data at any time.', 'Security privacy section description'),
('content', 'sec_cta_heading', 'Questions about security?', 'Security CTA heading'),
('content', 'sec_cta_subtext', 'Our team is happy to answer any questions about how we protect your investments and data.', 'Security CTA subtext'),

-- API Docs page
('content', 'api_hero_title', 'API Documentation', 'API Docs page hero title'),
('content', 'api_hero_subtitle', 'Integrate Kamioi into your applications with our developer-friendly REST API.', 'API Docs page hero subtitle'),
('content', 'api_status_text', 'Our API is currently in private beta. We are working with select partners to refine the developer experience before public launch.', 'API Docs status text'),
('content', 'api_feature_1', 'RESTful API with JSON responses, OAuth 2.0 authentication, and comprehensive rate limiting. Access portfolio data, transactions, and account information programmatically.', 'API Docs feature 1 (REST API)'),
('content', 'api_feature_2', 'Real-time webhook notifications for transactions, round-ups, and portfolio changes. Subscribe to the events that matter to your integration.', 'API Docs feature 2 (Webhooks)'),
('content', 'api_feature_3', 'Official SDKs for JavaScript, Python, and Ruby. Get started quickly with code samples, type definitions, and interactive documentation.', 'API Docs feature 3 (SDKs)'),
('content', 'api_cta_heading', 'Want early access?', 'API Docs CTA heading'),
('content', 'api_cta_subtext', 'Request access to our private beta API program. We will get you set up with credentials and documentation.', 'API Docs CTA subtext')

ON CONFLICT (setting_key) DO NOTHING;
