import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults
   ----------------------------------------------- */

const DEFAULTS = {
  hiw_hero_title: 'How Kamioi works',
  hiw_hero_subtitle: 'Three simple steps to start building wealth with your everyday purchases.',
  hiw_step_1_title: 'Sign Up & Connect',
  hiw_step_1_desc: 'Create your account in under 60 seconds. Link your bank cards through our secure connection. We use bank-level encryption to protect your data.',
  hiw_step_2_title: 'Round Up & Invest',
  hiw_step_2_desc: 'Every time you make a purchase, we add your chosen round-up amount — $1, $2, $3, or more. That fixed amount is invested into diversified ETF portfolios matched to your risk profile.',
  hiw_step_3_title: 'Track & Grow',
  hiw_step_3_desc: 'Watch your portfolio grow in real-time. Get AI-powered insights and recommendations. Set goals and celebrate milestones as you build wealth.',
  hiw_example_title: 'See it in action',
  hiw_example_desc: 'You buy a coffee for $3.75. With a $1 round-up setting, Kamioi invests $1.00 automatically. Over time, these consistent amounts compound into significant wealth.',
  hiw_cta_button: 'Start investing today',
}

/* -----------------------------------------------
   Step gradients (not admin-managed)
   ----------------------------------------------- */

const STEP_GRADIENTS = [
  'var(--gradient-primary, linear-gradient(135deg, #7C3AED, #3B82F6))',
  'var(--gradient-step2, linear-gradient(135deg, #3B82F6, #06B6D4))',
  'var(--gradient-step3, linear-gradient(135deg, #06B6D4, #10B981))',
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
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="How It Works"
        description="Learn how Kamioi works in 3 simple steps: create your account, connect your cards, and watch your wealth grow through automatic round-up investing."
        canonical="https://kamioi.com/how-it-works"
      />
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
          {c.hiw_hero_title.includes('Kamioi') ? (
            <>
              {c.hiw_hero_title.split('Kamioi')[0]}
              <span
                style={{
                  backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                Kamioi
              </span>
              {c.hiw_hero_title.split('Kamioi')[1]}
            </>
          ) : (
            c.hiw_hero_title
          )}
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
          {c.hiw_hero_subtitle}
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
            background: 'var(--gradient-text, linear-gradient(180deg, #7C3AED, #3B82F6, #06B6D4))',
            borderRadius: '1px',
            opacity: 0.5,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
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
                  background: STEP_GRADIENTS[n - 1],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                <span style={{ fontSize: '24px', fontWeight: 800 }}>
                  {String(n).padStart(2, '0')}
                </span>
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
                  {(c as Record<string, string>)[`hiw_step_${n}_title`]}
                </h3>
                <p
                  style={{
                    fontSize: '15px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                  }}
                >
                  {(c as Record<string, string>)[`hiw_step_${n}_desc`]}
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
            {c.hiw_example_title}
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
            {c.hiw_example_desc}
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
                background: 'color-mix(in srgb, var(--purple) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--purple) 30%, transparent)',
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
                  color: 'var(--purple)',
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
                background: 'color-mix(in srgb, var(--blue) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--blue) 30%, transparent)',
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
                  color: 'var(--blue)',
                }}
              >
                $1.00
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                your chosen amount
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
                background: 'color-mix(in srgb, var(--teal) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--teal) 30%, transparent)',
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
                  color: 'var(--teal)',
                }}
              >
                $1.00
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                into stocks
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
            background: 'var(--gradient-primary, linear-gradient(135deg, #7C3AED, #3B82F6))',
            color: '#fff',
            textDecoration: 'none',
            padding: '14px 32px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '16px',
            fontWeight: 600,
            transition: 'var(--transition)',
          }}
        >
          {c.hiw_cta_button}
        </Link>
      </section>
    </PublicLayout>
  )
}
