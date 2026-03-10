import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults (admin-editable)
   ----------------------------------------------- */

const DEFAULTS = {
  sec_hero_title: 'Security & Privacy',
  sec_hero_subtitle: 'Your money and data are protected by the same security standards used by major banks and financial institutions.',
  sec_card_1_title: 'Bank-Level Encryption',
  sec_card_1_desc: 'All data is encrypted with 256-bit AES encryption at rest and TLS 1.3 in transit. Your financial information is protected by the same standards used by the world\'s largest banks.',
  sec_card_2_title: 'Multi-Factor Authentication',
  sec_card_2_desc: 'Secure your account with two-factor authentication, biometric login on mobile devices, and automatic session management that locks inactive accounts.',
  sec_card_3_title: 'Regulatory Compliance',
  sec_card_3_desc: 'Your investments are held in SIPC-insured accounts protecting up to $500,000. We undergo regular third-party security audits and comply with SOC 2 Type II standards.',
  sec_privacy_title: 'Your Data, Your Control',
  sec_privacy_desc: 'We never sell your personal data to third parties. Your financial information is used solely to provide and improve your investment experience. You can request a full export or deletion of your data at any time.',
  sec_cta_heading: 'Questions about security?',
  sec_cta_subtext: 'Our team is happy to answer any questions about how we protect your investments and data.',
}

/* -----------------------------------------------
   Icons
   ----------------------------------------------- */

function EncryptionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  )
}

function AuthIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function ComplianceIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

/* -----------------------------------------------
   Card data
   ----------------------------------------------- */

const CARDS = [
  { key: 'card_1' as const, icon: <EncryptionIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))', accent: 'purple' as const },
  { key: 'card_2' as const, icon: <AuthIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))', accent: 'blue' as const },
  { key: 'card_3' as const, icon: <ComplianceIcon />, gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))', accent: 'teal' as const },
]

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .sec-section { padding: 60px 20px !important; }
    .sec-hero { padding: 80px 20px 40px !important; }
    .sec-grid { grid-template-columns: 1fr !important; }
  }
`

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function Security() {
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="Security & Privacy — How Kamioi Protects Your Investments"
        description="Bank-level 256-bit AES encryption, SIPC insurance up to $500,000, two-factor authentication, and SOC 2 compliance. Learn how Kamioi keeps your data and investments safe."
        canonical="https://kamioi.com/security"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Kamioi Security & Privacy',
            description: c.sec_hero_subtitle,
            url: 'https://kamioi.com/security',
            isPartOf: { '@id': 'https://kamioi.com/#website' },
          }),
        }}
      />
      <style>{responsiveStyles}</style>

      {/* Hero */}
      <section
        className="sec-hero"
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
          Security &{' '}
          <span
            style={{
              backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Privacy
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
          {c.sec_hero_subtitle}
        </p>
      </section>

      {/* Security cards */}
      <section className="sec-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div className="sec-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {CARDS.map((card) => (
            <div key={card.key} className="glass-card" data-accent={card.accent} style={{ padding: 28 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: card.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                {card.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {c[`sec_${card.key}_title` as keyof typeof DEFAULTS]}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {c[`sec_${card.key}_desc` as keyof typeof DEFAULTS]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Privacy */}
      <section className="sec-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px' }}>
        <div className="glass-card" data-accent="purple" style={{ padding: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, textAlign: 'center' }}>
            {c.sec_privacy_title}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
            {c.sec_privacy_desc}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="sec-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          {c.sec_cta_heading}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {c.sec_cta_subtext}
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
