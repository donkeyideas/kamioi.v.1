import { Link } from 'react-router-dom'
import PublicLayout from '@/components/public/PublicLayout'
import { SEO } from '@/components/common/SEO'
import { useHomeContent } from '@/hooks/useHomeContent'

/* ------------------------------------------------------------------ */
/*  Inline SVG icons for the feature cards                            */
/* ------------------------------------------------------------------ */

function RoundUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 12l-4-4-4 4" />
      <path d="M12 16V8" />
    </svg>
  )
}

function AiIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
      <path d="M6 10a2 2 0 0 0-2 2v1a2 2 0 0 0 4 0v-1a2 2 0 0 0-2-2z" />
      <path d="M18 10a2 2 0 0 0-2 2v1a2 2 0 0 0 4 0v-1a2 2 0 0 0-2-2z" />
      <path d="M12 16v4" />
      <path d="M8 20h8" />
    </svg>
  )
}

function GoalIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared style fragments                                            */
/* ------------------------------------------------------------------ */

const sectionStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '80px 40px',
  position: 'relative',
  zIndex: 1,
}

const gradientText: React.CSSProperties = {
  background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const sectionHeading: React.CSSProperties = {
  fontSize: 'clamp(28px, 4vw, 40px)',
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: '16px',
  color: 'var(--text-primary)',
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function Home() {
  const { content: c } = useHomeContent()

  // Split hero heading on last two words for gradient effect
  const headingWords = c.hero_heading.split(' ')
  const gradientPart = headingWords.length > 2 ? headingWords.slice(-2).join(' ') : headingWords.slice(-1).join(' ')
  const plainPart = headingWords.length > 2 ? headingWords.slice(0, -2).join(' ') : headingWords.slice(0, -1).join(' ')

  const features = [
    { title: c.feature_1, desc: c.feature_1_desc, icon: <RoundUpIcon />, accent: 'purple', color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
    { title: c.feature_2, desc: c.feature_2_desc, icon: <AiIcon />, accent: 'blue', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
    { title: c.feature_3, desc: c.feature_3_desc, icon: <GoalIcon />, accent: 'teal', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
  ]

  const steps = [
    { num: '1', title: c.step_1_title, desc: c.step_1_desc, gradient: 'linear-gradient(135deg, #7C3AED, #3B82F6)' },
    { num: '2', title: c.step_2_title, desc: c.step_2_desc, gradient: 'linear-gradient(135deg, #3B82F6, #06B6D4)' },
    { num: '3', title: c.step_3_title, desc: c.step_3_desc, gradient: 'linear-gradient(135deg, #06B6D4, #34D399)' },
  ]

  const stats = [
    { value: c.stat_1_value, label: c.stat_1_label },
    { value: c.stat_2_value, label: c.stat_2_label },
    { value: c.stat_3_value, label: c.stat_3_label },
    { value: c.stat_4_value, label: c.stat_4_label },
  ]

  const trustBadges = [c.trust_badge_1, c.trust_badge_2, c.trust_badge_3].filter(Boolean)

  const hasAppLinks = c.app_store_url || c.play_store_url

  return (
    <PublicLayout>
      <SEO
        title="AI-Powered Micro-Investing"
        description="Kamioi automatically rounds up your everyday purchases and invests the difference into diversified portfolios. Build wealth effortlessly with AI-powered micro-investing."
        canonical="https://kamioi.com/"
        ogType="website"
      />

      {/* Structured Data — Organization + WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': 'https://kamioi.com/#organization',
                name: 'Kamioi',
                url: 'https://kamioi.com',
                logo: 'https://kamioi.com/favicon.png',
                description: 'AI-powered micro-investing platform that rounds up everyday purchases and invests the spare change into diversified portfolios.',
                sameAs: [
                  'https://twitter.com/kamioi',
                  'https://linkedin.com/company/kamioi',
                ],
              },
              {
                '@type': 'WebSite',
                '@id': 'https://kamioi.com/#website',
                url: 'https://kamioi.com',
                name: 'Kamioi',
                publisher: { '@id': 'https://kamioi.com/#organization' },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: 'https://kamioi.com/blog?q={search_term_string}',
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@type': 'WebPage',
                '@id': 'https://kamioi.com/#webpage',
                url: 'https://kamioi.com',
                name: 'Kamioi - AI-Powered Micro-Investing',
                description: 'Round up your everyday purchases and invest the spare change automatically. Build wealth with AI-powered micro-investing.',
                isPartOf: { '@id': 'https://kamioi.com/#website' },
              },
              {
                '@type': 'SoftwareApplication',
                name: 'Kamioi',
                operatingSystem: 'iOS, Android',
                applicationCategory: 'FinanceApplication',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: '4.8',
                  ratingCount: '12000',
                  bestRating: '5',
                },
              },
            ],
          }),
        }}
      />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section
        style={{
          ...sectionStyle,
          paddingTop: '120px',
          paddingBottom: '80px',
          maxWidth: '800px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '24px',
            color: 'var(--text-primary)',
          }}
        >
          {plainPart}{plainPart ? ' ' : ''}
          <span style={gradientText}>{gradientPart}</span>
        </h1>

        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto 40px',
            lineHeight: 1.7,
          }}
        >
          {c.hero_subheading}
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to={c.hero_cta_link}
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
              color: '#fff',
              textDecoration: 'none',
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              transition: 'box-shadow 300ms ease, transform 300ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.45)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {c.hero_cta_text}
          </Link>
          <Link
            to="/how-it-works"
            style={{
              background: 'var(--surface-input)',
              border: '1px solid var(--border-subtle)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 500,
              transition: 'background 300ms ease, transform 300ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-input)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-input)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            See How It Works
          </Link>
        </div>

        {/* Trust indicators */}
        {trustBadges.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '32px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: '40px',
            }}
          >
            {trustBadges.map((text) => (
              <span
                key={text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="rgba(6,182,212,0.2)" />
                  <path d="M5 8l2 2 4-4" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {text}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================
          SECTION 2 — FEATURES PREVIEW (3 cards)
          ============================================================ */}
      <section style={sectionStyle}>
        <h2 style={sectionHeading}>{c.features_heading}</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginTop: '48px',
          }}
        >
          {features.map((f) => (
            <div key={f.title} className="glass-card" data-accent={f.accent} style={{ padding: '32px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: f.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: f.color,
                  marginBottom: '20px',
                }}
              >
                {f.icon}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link
            to="/features"
            style={{
              color: 'var(--blue)',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 300ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Explore all features
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — HOW IT WORKS (3 steps)
          ============================================================ */}
      <section style={sectionStyle}>
        <h2 style={sectionHeading}>{c.steps_heading}</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '40px',
            marginTop: '48px',
          }}
        >
          {steps.map((step) => (
            <div key={step.num} style={{ textAlign: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  background: step.gradient,
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#fff',
                  marginBottom: '20px',
                  boxShadow: '0 8px 24px rgba(124,58,237,0.2)',
                }}
              >
                {step.num}
              </span>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '10px',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  maxWidth: '300px',
                  margin: '0 auto',
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link
            to="/register"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
              color: '#fff',
              textDecoration: 'none',
              padding: '14px 36px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              display: 'inline-block',
              transition: 'box-shadow 300ms ease, transform 300ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.45)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — STATS / SOCIAL PROOF
          ============================================================ */}
      <section style={sectionStyle}>
        <div
          className="glass-card"
          style={{
            padding: '48px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '32px',
            textAlign: 'center',
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div
                style={{
                  fontSize: 'clamp(28px, 4vw, 36px)',
                  fontWeight: 800,
                  marginBottom: '6px',
                  ...gradientText,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — MOBILE APP DOWNLOAD
          ============================================================ */}
      <section style={sectionStyle}>
        <h2 style={sectionHeading}>{c.app_section_heading}</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '500px', margin: '0 auto 40px', lineHeight: 1.6 }}>
          {c.app_section_subtext}
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* App Store Badge */}
          <a
            href={c.app_store_url && c.app_store_url !== '#' ? c.app_store_url : undefined}
            onClick={(!c.app_store_url || c.app_store_url === '#') ? (e: React.MouseEvent) => e.preventDefault() : undefined}
            target={c.app_store_url && c.app_store_url !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="Download on the App Store"
            style={{
              display: 'inline-block',
              transition: 'transform 200ms ease, opacity 200ms ease',
              opacity: (!c.app_store_url || c.app_store_url === '#') ? 0.5 : 1,
              cursor: (!c.app_store_url || c.app_store_url === '#') ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => { if (c.app_store_url && c.app_store_url !== '#') { e.currentTarget.style.transform = 'scale(1.05)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <img
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="Download on the App Store"
              height="54"
              style={{ display: 'block' }}
            />
          </a>
          {/* Google Play Badge */}
          <a
            href={c.play_store_url && c.play_store_url !== '#' ? c.play_store_url : undefined}
            onClick={(!c.play_store_url || c.play_store_url === '#') ? (e: React.MouseEvent) => e.preventDefault() : undefined}
            target={c.play_store_url && c.play_store_url !== '#' ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="Get it on Google Play"
            style={{
              display: 'inline-block',
              transition: 'transform 200ms ease, opacity 200ms ease',
              opacity: (!c.play_store_url || c.play_store_url === '#') ? 0.5 : 1,
              cursor: (!c.play_store_url || c.play_store_url === '#') ? 'default' : 'pointer',
            }}
            onMouseEnter={(e) => { if (c.play_store_url && c.play_store_url !== '#') { e.currentTarget.style.transform = 'scale(1.05)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <img
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              alt="Get it on Google Play"
              height="80"
              style={{ display: 'block', marginTop: '-13px', marginBottom: '-13px' }}
            />
          </a>
        </div>
        {(!c.app_store_url || c.app_store_url === '#' || !c.play_store_url || c.play_store_url === '#') && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px', fontStyle: 'italic' }}>
            Coming soon to the App Store and Google Play
          </p>
        )}
      </section>

      {/* ============================================================
          SECTION 6 — CTA BANNER
          ============================================================ */}
      <section style={sectionStyle}>
        <div
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
            borderRadius: '20px',
            padding: '64px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle overlay pattern */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />

          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '16px',
              position: 'relative',
            }}
          >
            {c.cta_heading}
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.8)',
              maxWidth: '480px',
              margin: '0 auto 32px',
              lineHeight: 1.6,
              position: 'relative',
            }}
          >
            {c.cta_subtext}
          </p>
          <Link
            to="/register"
            style={{
              background: '#fff',
              color: '#1E293B',
              textDecoration: 'none',
              padding: '14px 36px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
              display: 'inline-block',
              position: 'relative',
              transition: 'transform 300ms ease, box-shadow 300ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {c.cta_button_text}
          </Link>
        </div>
      </section>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          section {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
        }
      `}</style>
    </PublicLayout>
  )
}
