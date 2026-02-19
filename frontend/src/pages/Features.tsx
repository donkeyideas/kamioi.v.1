import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'

/* -----------------------------------------------
   Icon components for each feature card
   ----------------------------------------------- */

function RoundUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 12l-4-4-4 4" />
      <path d="M12 16V8" />
    </svg>
  )
}

function AiEngineIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1a3 3 0 0 1-3 3h-1a4 4 0 0 1-4-4" />
      <path d="M8 6a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3v2a2 2 0 0 0 2 2h1a3 3 0 0 0 3 3h1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function GoalIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function FamilyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BusinessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function AnalyticsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </svg>
  )
}

/* -----------------------------------------------
   Feature data
   ----------------------------------------------- */

interface FeatureItem {
  title: string
  description: string
  accent: 'purple' | 'blue' | 'teal' | 'pink'
  icon: React.ReactNode
  gradient: string
}

const FEATURES: FeatureItem[] = [
  {
    title: 'Automatic Round-Ups',
    description:
      'Every purchase rounds up to the nearest dollar. Your spare change is automatically invested into your portfolio.',
    accent: 'purple',
    icon: <RoundUpIcon />,
    gradient: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
  },
  {
    title: 'AI Investment Engine',
    description:
      'Machine learning algorithms analyze market trends and your risk profile to optimize your portfolio allocation.',
    accent: 'blue',
    icon: <AiEngineIcon />,
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
  },
  {
    title: 'Goal Tracking',
    description:
      'Set financial goals with target amounts and dates. Track progress with visual dashboards and milestone celebrations.',
    accent: 'teal',
    icon: <GoalIcon />,
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
  },
  {
    title: 'Family Plans',
    description:
      'Manage family investments together. Parents can oversee children\'s accounts and set spending limits.',
    accent: 'pink',
    icon: <FamilyIcon />,
    gradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
  },
  {
    title: 'Business Accounts',
    description:
      'Employee benefit programs with round-up investing. Manage team accounts and generate compliance reports.',
    accent: 'purple',
    icon: <BusinessIcon />,
    gradient: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
  },
  {
    title: 'Real-Time Analytics',
    description:
      'Track your portfolio performance, spending patterns, and investment growth with live dashboards.',
    accent: 'blue',
    icon: <AnalyticsIcon />,
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
  },
]

/* -----------------------------------------------
   Responsive style tag
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .features-grid {
      grid-template-columns: 1fr !important;
    }
    .features-section {
      padding: 60px 20px !important;
    }
    .features-hero {
      padding: 80px 20px 40px !important;
    }
  }
`

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function Features() {
  return (
    <PublicLayout>
      <style>{responsiveStyles}</style>

      {/* Hero section */}
      <section
        className="features-hero"
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
          Everything you need to{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            invest smarter
          </span>
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '640px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Kamioi combines automatic round-ups, AI-powered insights, and goal-based
          investing into one platform.
        </p>
      </section>

      {/* Feature grid */}
      <section
        className="features-section"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 40px 80px',
        }}
      >
        <div
          className="features-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
          }}
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="glass-card"
              data-accent={feature.accent}
              style={{ padding: '28px' }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: feature.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                {feature.icon}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                {feature.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="features-section"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 40px 80px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '24px',
          }}
        >
          Ready to get started?
        </h2>
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
          Create Free Account
        </Link>
      </section>
    </PublicLayout>
  )
}
