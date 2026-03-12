import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public'
import { Button } from '@/components/ui'
import { SEO } from '@/components/common/SEO.tsx'
import { usePricingPlans, planAccent } from '@/hooks/usePricingPlans'
import { usePageContent } from '@/hooks/usePageContent'
import type { PricingPlan } from '@/hooks/usePricingPlans'

/* ------------------------------------------------------------------ */
/*  Content defaults                                                   */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  price_hero_title: 'Simple, transparent pricing',
  price_hero_subtitle: 'No hidden fees. No surprises. Choose the plan that fits your needs.',
  price_footer_note: 'All plans include: Bank-level security \u00b7 SIPC insurance \u00b7 Cancel anytime',
}

/* ------------------------------------------------------------------ */
/*  Icons — same 44px gradient boxes as About / Home cards             */
/* ------------------------------------------------------------------ */

const PLAN_ICONS: Record<string, { icon: React.ReactNode; gradient: string }> = {
  individual: {
    gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  family: {
    gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  business: {
    gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
}

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
  backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text' as const,
  color: 'transparent',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 18,
  color: 'var(--text-secondary)',
  maxWidth: 520,
  margin: '0 auto',
  lineHeight: 1.6,
}

const footerNoteStyle: React.CSSProperties = {
  textAlign: 'center',
  marginTop: 48,
  fontSize: 14,
  color: 'var(--text-muted)',
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
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
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
          border: '1px solid var(--border-subtle)',
          background: isYearly
            ? 'var(--gradient-primary, linear-gradient(135deg, #7C3AED, #3B82F6))'
            : 'var(--surface-input)',
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
            background: 'var(--text-primary)',
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
  plan,
  isYearly,
}: {
  plan: PricingPlan
  isYearly: boolean
}) {
  const price = isYearly ? plan.price_yearly : plan.price_monthly
  const period = isYearly ? '/yr' : '/mo'
  const accent = planAccent(plan.account_type)
  const isBusiness = plan.account_type === 'business'
  const features = plan.display_features ?? []
  const planIcon = PLAN_ICONS[plan.account_type] ?? PLAN_ICONS.individual

  return (
    <div
      className="glass-card"
      data-accent={accent}
      style={{ padding: 28, display: 'flex', flexDirection: 'column' }}
    >
      {/* Icon + Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: planIcon.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {planIcon.icon}
        </div>
        {plan.is_featured && (
          <span
            style={{
              background: 'var(--gradient-primary, linear-gradient(135deg, #3B82F6, #06B6D4))',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '3px 10px',
              borderRadius: 20,
            }}
          >
            Most Popular
          </span>
        )}
      </div>

      {/* Plan name */}
      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {plan.name}
      </h3>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
          ${price.toFixed(2)}
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          {period}
        </span>
      </div>

      {/* Feature list */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', flex: 1 }}>
        {features.map((feature) => (
          <li
            key={feature}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--text-muted)',
              padding: '5px 0',
              lineHeight: 1.5,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="8" fill="rgba(6,182,212,0.15)" />
              <path d="M5 8l2 2 4-4" stroke="#06B6D4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isBusiness ? (
        <Link to="/contact" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" size="lg" fullWidth>
            Contact Sales
          </Button>
        </Link>
      ) : (
        <Link to="/register" style={{ textDecoration: 'none' }}>
          <Button variant={plan.is_featured ? 'primary' : 'secondary'} size="lg" fullWidth>
            Get Started
          </Button>
        </Link>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false)
  const { plans, loading } = usePricingPlans()
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="Pricing"
        description="Simple, transparent pricing for Kamioi micro-investing. Individual, Family, and Business plans."
        canonical="https://kamioi.com/pricing"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kamioi.com/' },
              { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://kamioi.com/pricing' },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'How much does Kamioi cost?', acceptedAnswer: { '@type': 'Answer', text: 'Kamioi offers transparent, flat monthly pricing with no hidden fees. Individual plans start at an affordable monthly rate. Family and Business plans include additional features at competitive prices. All plans include zero trading commissions.' } },
              { '@type': 'Question', name: 'Are there any hidden fees?', acceptedAnswer: { '@type': 'Answer', text: 'No. Kamioi charges a simple flat monthly fee with no hidden costs, no trading commissions, and no withdrawal penalties. What you see is what you pay.' } },
              { '@type': 'Question', name: 'Can I cancel my plan anytime?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. You can cancel your Kamioi subscription at any time with no penalties. Your investments remain yours, and you can withdraw your funds at any time.' } },
              { '@type': 'Question', name: 'Is there a free trial?', acceptedAnswer: { '@type': 'Answer', text: 'Kamioi offers a free tier so you can experience the platform before committing to a paid plan. No credit card required to get started.' } },
              { '@type': 'Question', name: 'What is the difference between Individual and Family plans?', acceptedAnswer: { '@type': 'Answer', text: 'Individual plans are for single investors. Family plans let you manage investing for your entire household — add family members, set individual round-up amounts, and track combined portfolio performance from one dashboard.' } },
            ],
          },
        ]}
      />

      <section style={sectionStyle}>
        {/* Hero */}
        <div style={heroStyle}>
          <h1 style={h1Style}>{c.price_hero_title}</h1>
          <p style={subtitleStyle}>
            {c.price_hero_subtitle}
          </p>
        </div>

        {/* Toggle */}
        <BillingToggle
          isYearly={isYearly}
          onToggle={() => setIsYearly((prev) => !prev)}
        />

        {/* Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 200ms ease',
          }}
          className="pricing-grid"
        >
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} isYearly={isYearly} />
          ))}
        </div>

        {/* Footer note */}
        <p style={footerNoteStyle}>
          {c.price_footer_note}
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
