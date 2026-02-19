import { Link } from 'react-router-dom'
import PublicLayout from '@/components/public/PublicLayout'

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
  return (
    <PublicLayout>
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
          Invest Your{' '}
          <span style={gradientText}>Spare Change</span>
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
          Kamioi automatically rounds up your everyday purchases and invests
          the difference into diversified portfolios. Build wealth effortlessly
          with AI-powered micro-investing.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/register"
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
            Start Investing Free
          </Link>
          <Link
            to="/how-it-works"
            style={{
              background: 'rgba(255,255,255,0.06)',
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
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            See How It Works
          </Link>
        </div>

        {/* Trust indicators */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '40px',
          }}
        >
          {['No minimum investment', 'FDIC insured', 'Cancel anytime'].map((text) => (
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
      </section>

      {/* ============================================================
          SECTION 2 — FEATURES PREVIEW (3 cards)
          ============================================================ */}
      <section style={sectionStyle}>
        <h2 style={sectionHeading}>Smart investing made simple</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginTop: '48px',
          }}
        >
          {/* Card 1 — Round-Ups */}
          <div className="glass-card" data-accent="purple" style={{ padding: '32px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(124,58,237,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7C3AED',
                marginBottom: '20px',
              }}
            >
              <RoundUpIcon />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Automatic Round-Ups
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              Every purchase is rounded up to the nearest dollar. The spare change is automatically invested.
            </p>
          </div>

          {/* Card 2 — AI Insights */}
          <div className="glass-card" data-accent="blue" style={{ padding: '32px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(59,130,246,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3B82F6',
                marginBottom: '20px',
              }}
            >
              <AiIcon />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              AI-Powered Insights
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              Our AI analyzes your spending patterns and optimizes your investment strategy in real-time.
            </p>
          </div>

          {/* Card 3 — Goals */}
          <div className="glass-card" data-accent="teal" style={{ padding: '32px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(6,182,212,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#06B6D4',
                marginBottom: '20px',
              }}
            >
              <GoalIcon />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Goal-Based Investing
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              Set savings goals and track your progress. Our AI adjusts your strategy to help you reach them faster.
            </p>
          </div>
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
        <h2 style={sectionHeading}>Start in under 2 minutes</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '40px',
            marginTop: '48px',
          }}
        >
          {[
            {
              num: '1',
              title: 'Create Your Account',
              desc: 'Sign up in seconds with just your email. No paperwork needed.',
              gradient: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
            },
            {
              num: '2',
              title: 'Connect Your Cards',
              desc: 'Link your debit or credit cards securely. We never store your card details.',
              gradient: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
            },
            {
              num: '3',
              title: 'Watch Your Wealth Grow',
              desc: 'Every purchase rounds up automatically. Watch your portfolio grow daily.',
              gradient: 'linear-gradient(135deg, #06B6D4, #34D399)',
            },
          ].map((step) => (
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
          {[
            { value: '$2.4M+', label: 'Invested by users' },
            { value: '12,000+', label: 'Active investors' },
            { value: '99.9%', label: 'Uptime' },
            { value: '4.8/5', label: 'App Store rating' },
          ].map((stat) => (
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
          SECTION 5 — CTA BANNER
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
            Ready to start building wealth?
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
            Join thousands of investors who are growing their portfolios with spare change.
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
            Create Free Account
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
