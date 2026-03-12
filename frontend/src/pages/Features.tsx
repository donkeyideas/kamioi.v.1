import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults
   ----------------------------------------------- */

const DEFAULTS = {
  feat_hero_title: 'Everything you need to invest smarter',
  feat_hero_subtitle: 'Kamioi combines automatic round-ups, AI-powered insights, and goal-based investing into one platform.',
  feat_1_title: 'Automatic Round-Ups',
  feat_1_desc: 'Choose a whole-dollar round-up amount — $1, $2, $3, or more. Every purchase automatically invests that amount into your portfolio.',
  feat_2_title: 'AI Investment Engine',
  feat_2_desc: 'Machine learning algorithms analyze market trends and your risk profile to optimize your portfolio allocation.',
  feat_3_title: 'Goal Tracking',
  feat_3_desc: 'Set financial goals with target amounts and dates. Track progress with visual dashboards and milestone celebrations.',
  feat_4_title: 'Family Plans',
  feat_4_desc: "Manage family investments together. Parents can oversee children's accounts and set spending limits.",
  feat_5_title: 'Business Accounts',
  feat_5_desc: 'Employee benefit programs with round-up investing. Manage team accounts and generate compliance reports.',
  feat_6_title: 'Real-Time Analytics',
  feat_6_desc: 'Track your portfolio performance, spending patterns, and investment growth with live dashboards.',
  feat_cta_title: 'Ready to get started?',
  feat_cta_button: 'Create Free Account',
}

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
   Feature metadata (icons/accents are not admin-managed)
   ----------------------------------------------- */

const FEATURE_META = [
  { key: 1 as const, accent: 'purple' as const, icon: <RoundUpIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))' },
  { key: 2 as const, accent: 'blue' as const, icon: <AiEngineIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))' },
  { key: 3 as const, accent: 'teal' as const, icon: <GoalIcon />, gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))' },
  { key: 4 as const, accent: 'pink' as const, icon: <FamilyIcon />, gradient: 'var(--gradient-icon-pink, linear-gradient(135deg, #EC4899, #DB2777))' },
  { key: 5 as const, accent: 'purple' as const, icon: <BusinessIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))' },
  { key: 6 as const, accent: 'blue' as const, icon: <AnalyticsIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))' },
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
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="Features"
        description="Discover Kamioi's powerful features: automatic round-ups, AI-powered investment insights, goal-based investing, family plans, business accounts, and real-time analytics."
        canonical="https://kamioi.com/features"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kamioi.com/' },
              { '@type': 'ListItem', position: 2, name: 'Features', item: 'https://kamioi.com/features' },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              { '@type': 'Question', name: 'What is automatic round-up investing?', acceptedAnswer: { '@type': 'Answer', text: 'Kamioi adds a fixed whole-dollar amount you choose — like $1, $2, or $3 — to every purchase and invests it automatically into real stocks. Over time, these consistent amounts compound, helping you build wealth without changing your spending habits.' } },
              { '@type': 'Question', name: 'How does AI-powered stock matching work?', acceptedAnswer: { '@type': 'Answer', text: 'Our AI analyzes your spending patterns to match purchases with relevant stocks. Buy coffee at Starbucks, and your round-up goes toward Starbucks stock. The system continuously monitors your portfolio and provides personalized insights.' } },
              { '@type': 'Question', name: 'Does Kamioi support family investing?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Kamioi Family plans let you manage investing for your entire household from one dashboard. Add family members, set individual round-up amounts, and track combined portfolio performance.' } },
              { '@type': 'Question', name: 'Can I track my portfolio in real-time?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Kamioi provides real-time portfolio tracking with detailed analytics, spending trends, investment growth charts, and stock-level breakdowns — all accessible from your dashboard.' } },
            ],
          },
        ]}
      />
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
          {c.feat_hero_title.includes('invest smarter') ? (
            <>
              Everything you need to{' '}
              <span
                style={{
                  backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                invest smarter
              </span>
            </>
          ) : (
            c.feat_hero_title
          )}
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
          {c.feat_hero_subtitle}
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
          {FEATURE_META.map((f) => (
            <div
              key={f.key}
              className="glass-card"
              data-accent={f.accent}
              style={{ padding: '28px' }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: f.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                {f.icon}
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                {(c as Record<string, string>)[`feat_${f.key}_title`]}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                }}
              >
                {(c as Record<string, string>)[`feat_${f.key}_desc`]}
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
          {c.feat_cta_title}
        </h2>
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
          {c.feat_cta_button}
        </Link>
      </section>
    </PublicLayout>
  )
}
