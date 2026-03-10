import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults (admin-editable)
   ----------------------------------------------- */

const DEFAULTS = {
  api_hero_title: 'API Documentation',
  api_hero_subtitle: 'Integrate Kamioi into your applications with our developer-friendly REST API.',
  api_status_text: 'Our API is currently in private beta. We are working with select partners to refine the developer experience before public launch.',
  api_feature_1: 'RESTful API with JSON responses, OAuth 2.0 authentication, and comprehensive rate limiting. Access portfolio data, transactions, and account information programmatically.',
  api_feature_2: 'Real-time webhook notifications for transactions, round-ups, and portfolio changes. Subscribe to the events that matter to your integration.',
  api_feature_3: 'Official SDKs for JavaScript, Python, and Ruby. Get started quickly with code samples, type definitions, and interactive documentation.',
  api_cta_heading: 'Want early access?',
  api_cta_subtext: 'Request access to our private beta API program. We will get you set up with credentials and documentation.',
}

/* -----------------------------------------------
   Icons
   ----------------------------------------------- */

function ApiIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function WebhookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function SdkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

/* -----------------------------------------------
   Feature cards data
   ----------------------------------------------- */

const FEATURES = [
  { key: 'feature_1' as const, title: 'REST API', icon: <ApiIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))', accent: 'purple' as const },
  { key: 'feature_2' as const, title: 'Webhooks', icon: <WebhookIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))', accent: 'blue' as const },
  { key: 'feature_3' as const, title: 'SDKs & Libraries', icon: <SdkIcon />, gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))', accent: 'teal' as const },
]

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .api-section { padding: 60px 20px !important; }
    .api-hero { padding: 80px 20px 40px !important; }
    .api-grid { grid-template-columns: 1fr !important; }
  }
`

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function ApiDocs() {
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="API Documentation — Integrate with Kamioi"
        description="Build on top of Kamioi with our REST API, webhooks, and official SDKs. Access portfolio data, transactions, and round-up automation programmatically."
        canonical="https://kamioi.com/api-docs"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Kamioi API Documentation',
            description: c.api_hero_subtitle,
            url: 'https://kamioi.com/api-docs',
            isPartOf: { '@id': 'https://kamioi.com/#website' },
          }),
        }}
      />
      <style>{responsiveStyles}</style>

      {/* Hero */}
      <section
        className="api-hero"
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
          API{' '}
          <span
            style={{
              backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Documentation
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          {c.api_hero_subtitle}
        </p>
      </section>

      {/* Status */}
      <section className="api-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 60px' }}>
        <div className="glass-card" data-accent="blue" style={{ padding: 40, textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3B82F6',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '6px 16px',
              borderRadius: 20,
              marginBottom: 16,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }} />
            Private Beta
          </div>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto' }}>
            {c.api_status_text}
          </p>
        </div>
      </section>

      {/* Feature cards */}
      <section className="api-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 32 }}>
          What we are building
        </h2>
        <div className="api-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {FEATURES.map((feat) => (
            <div key={feat.key} className="glass-card" data-accent={feat.accent} style={{ padding: 28 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: feat.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                {feat.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {feat.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {c[`api_${feat.key}` as keyof typeof DEFAULTS]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="api-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          {c.api_cta_heading}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {c.api_cta_subtext}
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
          Request API Access
        </Link>
      </section>
    </PublicLayout>
  )
}
