import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'

/* -----------------------------------------------
   Step data
   ----------------------------------------------- */

interface Step {
  number: string
  title: string
  description: string
  gradient: string
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Sign Up & Connect',
    description:
      'Create your account in under 60 seconds. Link your bank cards through our secure connection. We use bank-level encryption to protect your data.',
    gradient: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
  },
  {
    number: '02',
    title: 'Round Up & Invest',
    description:
      'Every time you make a purchase, we round up to the nearest dollar. Your spare change is pooled and invested into diversified ETF portfolios matched to your risk profile.',
    gradient: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
  },
  {
    number: '03',
    title: 'Track & Grow',
    description:
      'Watch your portfolio grow in real-time. Get AI-powered insights and recommendations. Set goals and celebrate milestones as you build wealth.',
    gradient: 'linear-gradient(135deg, #06B6D4, #10B981)',
  },
]

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .hiw-section {
      padding: 60px 20px !important;
    }
    .hiw-hero {
      padding: 80px 20px 40px !important;
    }
    .hiw-step {
      flex-direction: column !important;
      gap: 0 !important;
    }
    .hiw-step-number {
      position: relative !important;
      left: auto !important;
      margin-bottom: 16px !important;
    }
    .hiw-step-card {
      margin-left: 0 !important;
    }
    .hiw-timeline-line {
      display: none !important;
    }
    .hiw-example-calc {
      flex-direction: column !important;
      gap: 12px !important;
    }
    .hiw-example-calc-arrow {
      transform: rotate(90deg);
    }
  }
`

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function HowItWorks() {
  return (
    <PublicLayout>
      <style>{responsiveStyles}</style>

      {/* Hero section */}
      <section
        className="hiw-hero"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 40px 40px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '20px',
            color: 'var(--text-primary)',
          }}
        >
          How{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Kamioi
          </span>{' '}
          works
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '560px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Three simple steps to start building wealth with your everyday purchases.
        </p>
      </section>

      {/* Steps section with vertical timeline */}
      <section
        className="hiw-section"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 40px 80px',
          position: 'relative',
        }}
      >
        {/* Vertical gradient timeline line */}
        <div
          className="hiw-timeline-line"
          style={{
            position: 'absolute',
            left: '80px',
            top: '60px',
            bottom: '180px',
            width: '2px',
            background: 'linear-gradient(180deg, #7C3AED, #3B82F6, #06B6D4)',
            borderRadius: '1px',
            opacity: 0.5,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="hiw-step"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '32px',
                position: 'relative',
              }}
            >
              {/* Step number */}
              <div
                className="hiw-step-number"
                style={{
                  position: 'relative',
                  zIndex: 2,
                  flexShrink: 0,
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: step.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: 800 }}>{step.number}</span>
              </div>

              {/* Step card */}
              <div
                className="glass-card hiw-step-card"
                style={{
                  padding: '28px',
                  flex: 1,
                }}
              >
                <h3
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: '15px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Example section */}
      <section
        className="hiw-section"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 40px 80px',
        }}
      >
        <div
          className="glass-card"
          data-accent="purple"
          style={{ padding: '40px' }}
        >
          <h3
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            See it in action
          </h3>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              textAlign: 'center',
              maxWidth: '640px',
              margin: '0 auto 32px',
            }}
          >
            You buy a coffee for $3.75. Kamioi rounds up to $4.00 and invests the $0.25
            difference. Over time, these small amounts compound into significant wealth.
          </p>

          {/* Mini calculation */}
          <div
            className="hiw-example-calc"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              flexWrap: 'wrap',
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: 'rgba(124, 58, 237, 0.15)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: 'var(--radius-xs)',
                padding: '16px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Purchase
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#7C3AED',
                }}
              >
                $3.75
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                coffee
              </div>
            </div>

            {/* Arrow */}
            <svg
              className="hiw-example-calc-arrow"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>

            {/* Step 2 */}
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: 'var(--radius-xs)',
                padding: '16px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Round-Up
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#3B82F6',
                }}
              >
                $0.25
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                spare change
              </div>
            </div>

            {/* Arrow */}
            <svg
              className="hiw-example-calc-arrow"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>

            {/* Step 3 */}
            <div
              style={{
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: 'var(--radius-xs)',
                padding: '16px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Invested
              </div>
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#06B6D4',
                }}
              >
                Auto
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                automatically
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="hiw-section"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 40px 80px',
          textAlign: 'center',
        }}
      >
        <Link
          to="/register"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
            color: '#fff',
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '16px',
            fontWeight: 600,
            transition: 'var(--transition)',
          }}
        >
          Start investing today
        </Link>
      </section>
    </PublicLayout>
  )
}
