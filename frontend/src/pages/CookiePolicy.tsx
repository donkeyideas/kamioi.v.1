import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults (admin-editable)
   ----------------------------------------------- */

const DEFAULTS = {
  ck_hero_title: 'Cookie Policy',
  ck_hero_subtitle: 'This policy explains how Kamioi uses cookies and similar technologies to recognize you when you visit our platform.',
  ck_effective_date: 'March 1, 2026',
  ck_section_1_title: 'What Are Cookies?',
  ck_section_1_desc: 'Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences, keep you logged in, and understand how you interact with the platform. Cookies can be "session" cookies (deleted when you close your browser) or "persistent" cookies (remaining until they expire or you delete them).',
  ck_section_2_title: 'Essential Cookies',
  ck_section_2_desc: 'These cookies are required for the platform to function properly. They enable core features like authentication, session management, security protections, and remembering your preferences. Essential cookies cannot be disabled as the platform would not work without them.',
  ck_section_3_title: 'Analytics Cookies',
  ck_section_3_desc: 'We use analytics cookies to understand how visitors interact with our platform. This helps us identify popular features, detect usability issues, and improve the overall experience. Analytics data is aggregated and anonymized — we do not use it to personally identify you.',
  ck_section_4_title: 'Marketing Cookies',
  ck_section_4_desc: 'Marketing cookies may be used to deliver relevant advertisements and measure the effectiveness of our campaigns. These cookies track your activity across websites and may be set by our advertising partners. You can opt out of marketing cookies without affecting your use of the platform.',
  ck_section_5_title: 'Managing Your Preferences',
  ck_section_5_desc: 'You can control cookies through your browser settings. Most browsers allow you to block or delete cookies, set preferences for specific websites, and browse in private/incognito mode. Note that disabling essential cookies may prevent some features from working correctly.',
  ck_section_6_title: 'Updates to This Policy',
  ck_section_6_desc: 'We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. We will notify you of significant changes by posting a notice on our platform or sending you an email. We encourage you to review this policy periodically.',
  ck_cta_heading: 'Questions about cookies?',
  ck_cta_subtext: 'Contact our team if you have any questions about how we use cookies or how to manage your preferences.',
}

/* -----------------------------------------------
   Icons
   ----------------------------------------------- */

function CookieInfoIcon() {
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

function EssentialIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  )
}

function AnalyticsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function MarketingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function PreferencesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function UpdatesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

/* -----------------------------------------------
   Section data
   ----------------------------------------------- */

const SECTIONS = [
  { key: 'section_1' as const, icon: <CookieInfoIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))', accent: 'purple' as const },
  { key: 'section_2' as const, icon: <EssentialIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))', accent: 'blue' as const },
  { key: 'section_3' as const, icon: <AnalyticsIcon />, gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))', accent: 'teal' as const },
  { key: 'section_4' as const, icon: <MarketingIcon />, gradient: 'var(--gradient-icon-pink, linear-gradient(135deg, #EC4899, #DB2777))', accent: 'pink' as const },
  { key: 'section_5' as const, icon: <PreferencesIcon />, gradient: 'linear-gradient(135deg, #10B981, #059669)', accent: 'teal' as const },
  { key: 'section_6' as const, icon: <UpdatesIcon />, gradient: 'var(--gradient-icon-amber, linear-gradient(135deg, #F59E0B, #D97706))', accent: 'blue' as const },
]

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .ck-section { padding: 60px 20px !important; }
    .ck-hero { padding: 80px 20px 40px !important; }
    .ck-grid { grid-template-columns: 1fr !important; }
  }
`

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function CookiePolicy() {
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="Cookie Policy — How Kamioi Uses Cookies"
        description="Learn how Kamioi uses cookies and similar technologies. Understand essential, analytics, and marketing cookies and how to manage your preferences."
        canonical="https://kamioi.com/cookie-policy"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Kamioi Cookie Policy',
            description: c.ck_hero_subtitle,
            url: 'https://kamioi.com/cookie-policy',
            isPartOf: { '@id': 'https://kamioi.com/#website' },
          }),
        }}
      />
      <style>{responsiveStyles}</style>

      {/* Hero */}
      <section
        className="ck-hero"
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
          Cookie{' '}
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
          {c.ck_hero_subtitle}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
          Effective date: {c.ck_effective_date}
        </p>
      </section>

      {/* Cookie sections */}
      <section className="ck-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div className="ck-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
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
                {c[`ck_${sec.key}_title` as keyof typeof DEFAULTS]}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {c[`ck_${sec.key}_desc` as keyof typeof DEFAULTS]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="ck-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          {c.ck_cta_heading}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {c.ck_cta_subtext}
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
