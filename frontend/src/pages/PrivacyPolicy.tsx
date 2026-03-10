import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults (admin-editable)
   ----------------------------------------------- */

const DEFAULTS = {
  pp_hero_title: 'Privacy Policy',
  pp_hero_subtitle: 'Your privacy matters. This policy explains how Kamioi collects, uses, and protects your personal information.',
  pp_effective_date: 'March 1, 2026',
  pp_section_1_title: 'Information We Collect',
  pp_section_1_desc: 'We collect information you provide directly: name, email address, phone number, and financial information needed to operate your investment account. We also collect usage data such as transaction history, device information, and browsing activity within our platform to improve your experience.',
  pp_section_2_title: 'How We Use Your Information',
  pp_section_2_desc: 'Your information is used to operate and maintain your investment account, process round-up transactions, match purchases to relevant stocks, provide personalized portfolio insights, comply with financial regulations, and communicate important account updates. We never sell your personal data to third parties.',
  pp_section_3_title: 'Data Sharing & Third Parties',
  pp_section_3_desc: 'We share data only when necessary: with regulated brokerage partners to execute trades, with banking partners to process transactions, with identity verification services for compliance, and with service providers who help us operate the platform under strict confidentiality agreements.',
  pp_section_4_title: 'Data Security',
  pp_section_4_desc: 'We protect your data with 256-bit AES encryption at rest, TLS 1.3 encryption in transit, multi-factor authentication, regular third-party security audits, and SOC 2 Type II compliance. Your banking credentials are never stored on our servers.',
  pp_section_5_title: 'Your Rights & Choices',
  pp_section_5_desc: 'You have the right to access, correct, or delete your personal data at any time. You can opt out of marketing communications, request a full export of your data, and close your account. We honor Do Not Track browser signals and comply with CCPA, GDPR, and other applicable privacy regulations.',
  pp_section_6_title: 'Cookies & Tracking',
  pp_section_6_desc: 'We use essential cookies to keep you logged in and remember your preferences. Analytics cookies help us understand how you use the platform so we can improve it. You can manage cookie preferences in your browser settings or through our Cookie Policy page.',
  pp_cta_heading: 'Questions about your privacy?',
  pp_cta_subtext: 'Our team is here to help with any privacy-related concerns or data requests.',
}

/* -----------------------------------------------
   Icons
   ----------------------------------------------- */

function CollectionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function UsageIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function SharingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function SecurityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  )
}

function RightsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  )
}

function CookieIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="9" r="1" fill="#fff" />
      <circle cx="15" cy="7" r="1" fill="#fff" />
      <circle cx="10" cy="14" r="1" fill="#fff" />
      <circle cx="16" cy="13" r="1" fill="#fff" />
    </svg>
  )
}

/* -----------------------------------------------
   Section data
   ----------------------------------------------- */

const SECTIONS = [
  { key: 'section_1' as const, icon: <CollectionIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))', accent: 'purple' as const },
  { key: 'section_2' as const, icon: <UsageIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))', accent: 'blue' as const },
  { key: 'section_3' as const, icon: <SharingIcon />, gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))', accent: 'teal' as const },
  { key: 'section_4' as const, icon: <SecurityIcon />, gradient: 'var(--gradient-icon-pink, linear-gradient(135deg, #EC4899, #DB2777))', accent: 'pink' as const },
  { key: 'section_5' as const, icon: <RightsIcon />, gradient: 'linear-gradient(135deg, #10B981, #059669)', accent: 'teal' as const },
  { key: 'section_6' as const, icon: <CookieIcon />, gradient: 'var(--gradient-icon-amber, linear-gradient(135deg, #F59E0B, #D97706))', accent: 'blue' as const },
]

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .pp-section { padding: 60px 20px !important; }
    .pp-hero { padding: 80px 20px 40px !important; }
    .pp-grid { grid-template-columns: 1fr !important; }
  }
`

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function PrivacyPolicy() {
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="Privacy Policy — How Kamioi Protects Your Data"
        description="Learn how Kamioi collects, uses, and protects your personal and financial information. Bank-level encryption, CCPA & GDPR compliance, and full data transparency."
        canonical="https://kamioi.com/privacy-policy"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Kamioi Privacy Policy',
            description: c.pp_hero_subtitle,
            url: 'https://kamioi.com/privacy-policy',
            isPartOf: { '@id': 'https://kamioi.com/#website' },
          }),
        }}
      />
      <style>{responsiveStyles}</style>

      {/* Hero */}
      <section
        className="pp-hero"
        style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px 40px', textAlign: 'center' }}
      >
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 20,
            color: 'var(--text-primary)',
          }}
        >
          Privacy{' '}
          <span
            style={{
              backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Policy
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
          {c.pp_hero_subtitle}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
          Effective date: {c.pp_effective_date}
        </p>
      </section>

      {/* Policy sections */}
      <section className="pp-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div className="pp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {SECTIONS.map((sec) => (
            <div key={sec.key} className="glass-card" data-accent={sec.accent} style={{ padding: 28 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: sec.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                {sec.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {c[`pp_${sec.key}_title` as keyof typeof DEFAULTS]}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {c[`pp_${sec.key}_desc` as keyof typeof DEFAULTS]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pp-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          {c.pp_cta_heading}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {c.pp_cta_subtext}
        </p>
        <Link
          to="/contact"
          style={{
            display: 'inline-block',
            background: 'var(--gradient-primary, linear-gradient(135deg, #7C3AED, #3B82F6))',
            color: '#fff',
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Contact Us
        </Link>
      </section>
    </PublicLayout>
  )
}
