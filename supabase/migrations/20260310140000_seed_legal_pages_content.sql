-- Seed initial content for Privacy Policy, Terms of Service, and Cookie Policy pages
-- All stored in admin_settings with setting_type='content'

INSERT INTO admin_settings (setting_type, setting_key, setting_value, description)
VALUES
-- Privacy Policy page
('content', 'pp_hero_title', 'Privacy Policy', 'Privacy Policy page hero title'),
('content', 'pp_hero_subtitle', 'Your privacy matters. This policy explains how Kamioi collects, uses, and protects your personal information.', 'Privacy Policy page hero subtitle'),
('content', 'pp_effective_date', 'March 1, 2026', 'Privacy Policy effective date'),
('content', 'pp_section_1_title', 'Information We Collect', 'Privacy Policy section 1 title'),
('content', 'pp_section_1_desc', 'We collect information you provide directly: name, email address, phone number, and financial information needed to operate your investment account. We also collect usage data such as transaction history, device information, and browsing activity within our platform to improve your experience.', 'Privacy Policy section 1 description'),
('content', 'pp_section_2_title', 'How We Use Your Information', 'Privacy Policy section 2 title'),
('content', 'pp_section_2_desc', 'Your information is used to operate and maintain your investment account, process round-up transactions, match purchases to relevant stocks, provide personalized portfolio insights, comply with financial regulations, and communicate important account updates. We never sell your personal data to third parties.', 'Privacy Policy section 2 description'),
('content', 'pp_section_3_title', 'Data Sharing & Third Parties', 'Privacy Policy section 3 title'),
('content', 'pp_section_3_desc', 'We share data only when necessary: with regulated brokerage partners to execute trades, with banking partners to process transactions, with identity verification services for compliance, and with service providers who help us operate the platform under strict confidentiality agreements.', 'Privacy Policy section 3 description'),
('content', 'pp_section_4_title', 'Data Security', 'Privacy Policy section 4 title'),
('content', 'pp_section_4_desc', 'We protect your data with 256-bit AES encryption at rest, TLS 1.3 encryption in transit, multi-factor authentication, regular third-party security audits, and SOC 2 Type II compliance. Your banking credentials are never stored on our servers.', 'Privacy Policy section 4 description'),
('content', 'pp_section_5_title', 'Your Rights & Choices', 'Privacy Policy section 5 title'),
('content', 'pp_section_5_desc', 'You have the right to access, correct, or delete your personal data at any time. You can opt out of marketing communications, request a full export of your data, and close your account. We honor Do Not Track browser signals and comply with CCPA, GDPR, and other applicable privacy regulations.', 'Privacy Policy section 5 description'),
('content', 'pp_section_6_title', 'Cookies & Tracking', 'Privacy Policy section 6 title'),
('content', 'pp_section_6_desc', 'We use essential cookies to keep you logged in and remember your preferences. Analytics cookies help us understand how you use the platform so we can improve it. You can manage cookie preferences in your browser settings or through our Cookie Policy page.', 'Privacy Policy section 6 description'),
('content', 'pp_cta_heading', 'Questions about your privacy?', 'Privacy Policy CTA heading'),
('content', 'pp_cta_subtext', 'Our team is here to help with any privacy-related concerns or data requests.', 'Privacy Policy CTA subtext'),

-- Terms of Service page
('content', 'tos_hero_title', 'Terms of Service', 'Terms of Service page hero title'),
('content', 'tos_hero_subtitle', 'Please read these terms carefully before using Kamioi. By creating an account, you agree to be bound by these terms.', 'Terms of Service page hero subtitle'),
('content', 'tos_effective_date', 'March 1, 2026', 'Terms of Service effective date'),
('content', 'tos_section_1_title', 'Account Eligibility', 'Terms of Service section 1 title'),
('content', 'tos_section_1_desc', 'You must be at least 18 years old and a legal resident of the United States to open a Kamioi investment account. By creating an account, you confirm that all information provided is accurate and complete. We reserve the right to verify your identity and may request additional documentation for compliance purposes.', 'Terms of Service section 1 description'),
('content', 'tos_section_2_title', 'Investment Services', 'Terms of Service section 2 title'),
('content', 'tos_section_2_desc', 'Kamioi provides automated micro-investing services through round-up transactions. All investments are made in fractional shares of publicly traded companies. Past performance does not guarantee future results. All investments carry risk, including the possible loss of principal. Kamioi does not provide personalized financial advice.', 'Terms of Service section 2 description'),
('content', 'tos_section_3_title', 'Fees & Billing', 'Terms of Service section 3 title'),
('content', 'tos_section_3_desc', 'You agree to pay the monthly subscription fee associated with your chosen plan. Fees are billed automatically and may be updated with 30 days advance notice. There are no trading commissions, withdrawal penalties, or hidden fees. You can cancel your subscription at any time from your account settings.', 'Terms of Service section 3 description'),
('content', 'tos_section_4_title', 'User Responsibilities', 'Terms of Service section 4 title'),
('content', 'tos_section_4_desc', 'You are responsible for maintaining the security of your account credentials, ensuring sufficient funds in your linked bank account for round-up transactions, providing accurate personal and financial information, and complying with all applicable laws and regulations regarding your investment account.', 'Terms of Service section 4 description'),
('content', 'tos_section_5_title', 'Intellectual Property', 'Terms of Service section 5 title'),
('content', 'tos_section_5_desc', 'All content, features, and functionality of the Kamioi platform — including the AI matching system, user interface, logos, and documentation — are owned by Kamioi and protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without written permission.', 'Terms of Service section 5 description'),
('content', 'tos_section_6_title', 'Limitation of Liability', 'Terms of Service section 6 title'),
('content', 'tos_section_6_desc', 'Kamioi is not liable for investment losses, market fluctuations, or trading delays beyond our control. We provide our services "as is" and make no guarantees regarding investment returns. Our total liability is limited to the fees you have paid in the twelve months preceding any claim. This does not affect your statutory rights.', 'Terms of Service section 6 description'),
('content', 'tos_section_7_title', 'Termination', 'Terms of Service section 7 title'),
('content', 'tos_section_7_desc', 'You may close your account at any time. Upon closure, any remaining investments will be liquidated and funds transferred to your linked bank account within 5-7 business days. We may suspend or terminate accounts that violate these terms, engage in fraudulent activity, or fail to comply with regulatory requirements.', 'Terms of Service section 7 description'),
('content', 'tos_section_8_title', 'Dispute Resolution', 'Terms of Service section 8 title'),
('content', 'tos_section_8_desc', 'Any disputes arising from these terms or your use of Kamioi will be resolved through binding arbitration in accordance with the American Arbitration Association rules. You agree to resolve disputes individually and waive any right to participate in class action lawsuits. This agreement is governed by the laws of the State of Delaware.', 'Terms of Service section 8 description'),
('content', 'tos_cta_heading', 'Have questions about our terms?', 'Terms of Service CTA heading'),
('content', 'tos_cta_subtext', 'Our team is happy to clarify any part of our Terms of Service.', 'Terms of Service CTA subtext'),

-- Cookie Policy page
('content', 'ck_hero_title', 'Cookie Policy', 'Cookie Policy page hero title'),
('content', 'ck_hero_subtitle', 'This policy explains how Kamioi uses cookies and similar technologies to recognize you when you visit our platform.', 'Cookie Policy page hero subtitle'),
('content', 'ck_effective_date', 'March 1, 2026', 'Cookie Policy effective date'),
('content', 'ck_section_1_title', 'What Are Cookies?', 'Cookie Policy section 1 title'),
('content', 'ck_section_1_desc', 'Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences, keep you logged in, and understand how you interact with the platform. Cookies can be "session" cookies (deleted when you close your browser) or "persistent" cookies (remaining until they expire or you delete them).', 'Cookie Policy section 1 description'),
('content', 'ck_section_2_title', 'Essential Cookies', 'Cookie Policy section 2 title'),
('content', 'ck_section_2_desc', 'These cookies are required for the platform to function properly. They enable core features like authentication, session management, security protections, and remembering your preferences. Essential cookies cannot be disabled as the platform would not work without them.', 'Cookie Policy section 2 description'),
('content', 'ck_section_3_title', 'Analytics Cookies', 'Cookie Policy section 3 title'),
('content', 'ck_section_3_desc', 'We use analytics cookies to understand how visitors interact with our platform. This helps us identify popular features, detect usability issues, and improve the overall experience. Analytics data is aggregated and anonymized — we do not use it to personally identify you.', 'Cookie Policy section 3 description'),
('content', 'ck_section_4_title', 'Marketing Cookies', 'Cookie Policy section 4 title'),
('content', 'ck_section_4_desc', 'Marketing cookies may be used to deliver relevant advertisements and measure the effectiveness of our campaigns. These cookies track your activity across websites and may be set by our advertising partners. You can opt out of marketing cookies without affecting your use of the platform.', 'Cookie Policy section 4 description'),
('content', 'ck_section_5_title', 'Managing Your Preferences', 'Cookie Policy section 5 title'),
('content', 'ck_section_5_desc', 'You can control cookies through your browser settings. Most browsers allow you to block or delete cookies, set preferences for specific websites, and browse in private/incognito mode. Note that disabling essential cookies may prevent some features from working correctly.', 'Cookie Policy section 5 description'),
('content', 'ck_section_6_title', 'Updates to This Policy', 'Cookie Policy section 6 title'),
('content', 'ck_section_6_desc', 'We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. We will notify you of significant changes by posting a notice on our platform or sending you an email. We encourage you to review this policy periodically.', 'Cookie Policy section 6 description'),
('content', 'ck_cta_heading', 'Questions about cookies?', 'Cookie Policy CTA heading'),
('content', 'ck_cta_subtext', 'Contact our team if you have any questions about how we use cookies or how to manage your preferences.', 'Cookie Policy CTA subtext')

ON CONFLICT (setting_key) DO NOTHING;
