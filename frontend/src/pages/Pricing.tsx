import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public'
import { GlassCard, Button } from '@/components/ui'
import { SEO } from '@/components/common/SEO.tsx'

/* ------------------------------------------------------------------ */
/*  Tier data                                                          */
/* ------------------------------------------------------------------ */

interface PricingTier {
  name: string
  accent: 'purple' | 'blue' | 'teal'
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  buttonLabel: string
  buttonVariant: 'primary' | 'secondary'
  popular: boolean
}

const tiers: PricingTier[] = [
  {
    name: 'Individual',
    accent: 'purple',
    monthlyPrice: 2.99,
    yearlyPrice: 28.99,
    features: [
      'Automatic round-ups',
      'Basic portfolio',
      'AI insights',
      'Mobile app',
      '1 linked card',
    ],
    buttonLabel: 'Get Started',
    buttonVariant: 'secondary',
    popular: false,
  },
  {
    name: 'Family',
    accent: 'blue',
    monthlyPrice: 5.99,
    yearlyPrice: 57.99,
    features: [
      'Everything in Individual',
      'Up to 5 family members',
      'Shared goals',
      'Family dashboard',
      'Priority support',
      '5 linked cards',
    ],
    buttonLabel: 'Get Started',
    buttonVariant: 'primary',
    popular: true,
  },
  {
    name: 'Business',
    accent: 'teal',
    monthlyPrice: 14.99,
    yearlyPrice: 143.99,
    features: [
      'Everything in Family',
      'Unlimited employees',
      'Admin dashboard',
      'Compliance reporting',
      'API access',
      'Dedicated support',
      'Unlimited linked cards',
    ],
    buttonLabel: 'Contact Sales',
    buttonVariant: 'secondary',
    popular: false,
  },
]

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const sectionStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '80px 40px',
}

const heroStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 56,
}

const h1Style: React.CSSProperties = {
  fontSize: 'clamp(32px, 5vw, 48px)',
  fontWeight: 800,
  lineHeight: 1.15,
  marginBottom: 16,
  background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 18,
  color: 'var(--text-secondary, rgba(248,250,252,0.6))',
  maxWidth: 520,
  margin: '0 auto',
  lineHeight: 1.6,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 24,
  alignItems: 'start',
}

const footerNoteStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: 48,
  fontSize: 14,
  color: 'var(--text-muted, rgba(248,250,252,0.4))',
}

/* ------------------------------------------------------------------ */
/*  Toggle component                                                   */
/* ------------------------------------------------------------------ */

function BillingToggle({
  isYearly,
  onToggle,
}: {
  isYearly: boolean
  onToggle: () => void
}) {
  const labelStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 14,
    fontWeight: 600,
    color: active ? '#F8FAFC' : 'rgba(248,250,252,0.4)',
    cursor: 'pointer',
    transition: 'color 200ms ease',
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 40,
      }}
    >
      <span style={labelStyle(!isYearly)}>Monthly</span>
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle billing period"
        style={{
          position: 'relative',
          width: 52,
          height: 28,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          background: isYearly
            ? 'linear-gradient(135deg, #7C3AED, #3B82F6)'
            : 'rgba(255,255,255,0.1)',
          cursor: 'pointer',
          transition: 'background 300ms ease',
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: isYearly ? 26 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#F8FAFC',
            transition: 'left 300ms ease',
          }}
        />
      </button>
      <span style={labelStyle(isYearly)}>
        Yearly{' '}
        <span
          style={{
            fontSize: 12,
            color: '#06B6D4',
            fontWeight: 700,
          }}
        >
          Save 20%
        </span>
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pricing card                                                       */
/* ------------------------------------------------------------------ */

function PricingCard({
  tier,
  isYearly,
}: {
  tier: PricingTier
  isYearly: boolean
}) {
  const price = isYearly ? tier.yearlyPrice : tier.monthlyPrice
  const period = isYearly ? '/yr' : '/mo'

  return (
    <GlassCard
      accent={tier.accent}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Badge */}
      {tier.popular && (
        <div
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '4px 12px',
            borderRadius: 20,
            marginBottom: 16,
          }}
        >
          Most Popular
        </div>
      )}

      {/* Tier name */}
      <h3
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#F8FAFC',
          marginBottom: 8,
          marginTop: tier.popular ? 0 : 0,
        }}
      >
        {tier.name}
      </h3>

      {/* Price */}
      <div style={{ marginBottom: 24 }}>
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: '#F8FAFC',
            lineHeight: 1,
          }}
        >
          ${price.toFixed(2)}
        </span>
        <span
          style={{
            fontSize: 14,
            color: 'rgba(248,250,252,0.5)',
            marginLeft: 4,
          }}
        >
          {period}
        </span>
      </div>

      {/* Feature list */}
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 32px 0',
          flex: 1,
        }}
      >
        {tier.features.map((feature) => (
          <li
            key={feature}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
              color: 'rgba(248,250,252,0.7)',
              padding: '6px 0',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <path
                d="M3 8.5L6.5 12L13 4"
                stroke="#06B6D4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {tier.buttonLabel === 'Contact Sales' ? (
        <Link to="/contact" style={{ textDecoration: 'none' }}>
          <Button variant={tier.buttonVariant} size="lg" fullWidth>
            {tier.buttonLabel}
          </Button>
        </Link>
      ) : (
        <Link to="/register" style={{ textDecoration: 'none' }}>
          <Button variant={tier.buttonVariant} size="lg" fullWidth>
            {tier.buttonLabel}
          </Button>
        </Link>
      )}
    </GlassCard>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <PublicLayout>
      <SEO
        title="Pricing"
        description="Simple, transparent pricing for Kamioi micro-investing. Individual, Family, and Business plans."
      />

      <section style={sectionStyle}>
        {/* Hero */}
        <div style={heroStyle}>
          <h1 style={h1Style}>Simple, transparent pricing</h1>
          <p style={subtitleStyle}>
            No hidden fees. No surprises. Choose the plan that fits your needs.
          </p>
        </div>

        {/* Toggle */}
        <BillingToggle
          isYearly={isYearly}
          onToggle={() => setIsYearly((prev) => !prev)}
        />

        {/* Cards */}
        <div style={gridStyle} className="pricing-grid">
          {tiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} isYearly={isYearly} />
          ))}
        </div>

        {/* Footer note */}
        <p style={footerNoteStyle}>
          All plans include: Bank-level security &middot; SIPC insurance &middot; Cancel
          anytime
        </p>
      </section>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
            max-width: 420px;
            margin: 0 auto;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .pricing-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </PublicLayout>
  )
}
