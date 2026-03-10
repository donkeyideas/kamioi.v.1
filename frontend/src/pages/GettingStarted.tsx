import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults (admin-editable)
   ----------------------------------------------- */

const DEFAULTS = {
  gs_hero_title: 'Getting Started',
  gs_hero_subtitle: 'Start investing in under two minutes. No minimum balance, no experience needed.',
  gs_step_1_title: 'Create Your Account',
  gs_step_1_desc: 'Sign up with your email and choose a plan that fits your needs — Individual, Family, or Business. Verification takes less than a minute.',
  gs_step_2_title: 'Link Your Bank',
  gs_step_2_desc: 'Securely connect your checking account or debit card. We use bank-level 256-bit encryption and never store your credentials.',
  gs_step_3_title: 'Set Your Round-Up Amount',
  gs_step_3_desc: 'Choose a whole-dollar amount — $1, $2, $3, or more — to invest with every purchase. You can change this anytime from your dashboard.',
  gs_next_title: 'What Happens Next',
  gs_next_desc: 'Every time you make a purchase, Kamioi automatically adds your chosen round-up amount and invests it into real stocks matched to the brands you buy. Your portfolio grows with every transaction — no extra effort required.',
  gs_cta_heading: 'Ready to start building wealth?',
  gs_cta_subtext: 'Create your free account and make your first investment today.',
}

/* -----------------------------------------------
   Icons
   ----------------------------------------------- */

function AccountIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function BankIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function RoundUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 12l-4-4-4 4" />
      <path d="M12 16V8" />
    </svg>
  )
}

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .gs-section { padding: 60px 20px !important; }
    .gs-hero { padding: 80px 20px 40px !important; }
    .gs-steps-grid { grid-template-columns: 1fr !important; }
  }
`

/* -----------------------------------------------
   Step data
   ----------------------------------------------- */

const STEPS = [
  { num: '1', key: 'step_1' as const, icon: <AccountIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))', accent: 'purple' as const },
  { num: '2', key: 'step_2' as const, icon: <BankIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))', accent: 'blue' as const },
  { num: '3', key: 'step_3' as const, icon: <RoundUpIcon />, gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))', accent: 'teal' as const },
]

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function GettingStarted() {
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="Getting Started — How to Begin Investing with Kamioi"
        description="Learn how to create your Kamioi account, link your bank, and start micro-investing with every purchase. No minimum balance required."
        canonical="https://kamioi.com/getting-started"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: c.gs_hero_title,
            description: c.gs_hero_subtitle,
            step: STEPS.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: c[`gs_step_${i + 1}_title` as keyof typeof DEFAULTS],
              text: c[`gs_step_${i + 1}_desc` as keyof typeof DEFAULTS],
            })),
          }),
        }}
      />
      <style>{responsiveStyles}</style>

      {/* Hero */}
      <section
        className="gs-hero"
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
          {c.gs_hero_title.split(' ').slice(0, -1).join(' ')}{' '}
          <span
            style={{
              backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {c.gs_hero_title.split(' ').slice(-1)[0]}
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          {c.gs_hero_subtitle}
        </p>
      </section>

      {/* Steps */}
      <section className="gs-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div
          className="gs-steps-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
        >
          {STEPS.map((step) => (
            <div key={step.num} className="glass-card" data-accent={step.accent} style={{ padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: step.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Step {step.num}
                </span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {c[`gs_${step.key}_title` as keyof typeof DEFAULTS]}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {c[`gs_${step.key}_desc` as keyof typeof DEFAULTS]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What happens next */}
      <section className="gs-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px' }}>
        <div className="glass-card" data-accent="purple" style={{ padding: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, textAlign: 'center' }}>
            {c.gs_next_title}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
            {c.gs_next_desc}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="gs-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          {c.gs_cta_heading}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {c.gs_cta_subtext}
        </p>
        <Link
          to="/register"
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
          Create Free Account
        </Link>
      </section>
    </PublicLayout>
  )
}
