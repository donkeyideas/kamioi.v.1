import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults
   ----------------------------------------------- */

const DEFAULTS = {
  about_hero_title: 'About Kamioi',
  about_hero_subtitle: 'We believe that everyone deserves the opportunity to build wealth — one purchase at a time.',
  about_mission_title: 'Our Mission',
  about_mission_desc: 'Kamioi was built on a simple idea: the money you spend every day can also be the money that builds your future. We created a platform where every purchase automatically invests a fixed dollar amount you choose into real stocks — turning routine transactions into long-term wealth.',
  about_values_title: 'Our Values',
  about_value_1_title: 'Transparency',
  about_value_1_desc: 'No hidden fees, no fine print. You always know exactly what you are paying and where your money is going.',
  about_value_2_title: 'Accessibility',
  about_value_2_desc: 'Investing should not require a minimum balance or a finance degree. We make it simple for everyone — individuals, families, and businesses.',
  about_value_3_title: 'Security',
  about_value_3_desc: 'Your data and investments are protected with bank-level 256-bit AES encryption, two-factor authentication, and regular security audits.',
  about_history_title: 'How It Started',
  about_history_p1: 'Kamioi started with a question: why does investing feel so separate from spending? We set out to bridge that gap — creating a platform where your purchases naturally flow into investments, with no extra effort required.',
  about_history_p2: 'Today, Kamioi serves individual investors, families, and businesses with a system that turns every transaction into a step toward financial growth.',
  about_cta_title: 'Ready to start?',
  about_cta_subtitle: 'Join Kamioi and turn your everyday spending into ownership.',
  about_cta_primary: 'Create Free Account',
  about_cta_secondary: 'Contact Us',
}

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .about-section {
      padding: 60px 20px !important;
    }
    .about-hero {
      padding: 80px 20px 40px !important;
    }
    .about-values-grid {
      grid-template-columns: 1fr !important;
    }
    .about-team-grid {
      grid-template-columns: 1fr !important;
    }
  }
`

/* -----------------------------------------------
   Icon components
   ----------------------------------------------- */

function TransparencyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function AccessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SecurityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

const VALUE_META = [
  { key: 1 as const, accent: 'purple' as const, icon: <TransparencyIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))' },
  { key: 2 as const, accent: 'blue' as const, icon: <AccessIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))' },
  { key: 3 as const, accent: 'teal' as const, icon: <SecurityIcon />, gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))' },
]

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function About() {
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="About"
        description="Kamioi is a micro-investing platform that turns everyday purchases into stock ownership. Learn about our mission, values, and the team behind the product."
        canonical="https://kamioi.com/about"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kamioi.com/' },
            { '@type': 'ListItem', position: 2, name: 'About', item: 'https://kamioi.com/about' },
          ],
        }}
      />
      <style>{responsiveStyles}</style>

      {/* Hero */}
      <section
        className="about-hero"
        style={{
          maxWidth: 1200,
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
            marginBottom: 20,
            color: 'var(--text-primary)',
          }}
        >
          {c.about_hero_title.includes('Kamioi') ? (
            <>
              {c.about_hero_title.split('Kamioi')[0]}
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
              {c.about_hero_title.split('Kamioi')[1]}
            </>
          ) : (
            c.about_hero_title
          )}
        </h1>
        <p
          style={{
            fontSize: 18,
            color: 'var(--text-secondary)',
            maxWidth: 640,
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          {c.about_hero_subtitle}
        </p>
      </section>

      {/* Mission */}
      <section
        className="about-section"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '40px 40px 80px',
        }}
      >
        <div
          className="glass-card"
          data-accent="purple"
          style={{ padding: 40 }}
        >
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {c.about_mission_title}
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              textAlign: 'center',
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            {c.about_mission_desc}
          </p>
        </div>
      </section>

      {/* Values */}
      <section
        className="about-section"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 40px 80px',
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 32,
            textAlign: 'center',
          }}
        >
          {c.about_values_title}
        </h2>
        <div
          className="about-values-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}
        >
          {VALUE_META.map((v) => (
            <div
              key={v.key}
              className="glass-card"
              data-accent={v.accent}
              style={{ padding: 28 }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: v.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                {v.icon}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 8,
                }}
              >
                {(c as Record<string, string>)[`about_value_${v.key}_title`]}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                }}
              >
                {(c as Record<string, string>)[`about_value_${v.key}_desc`]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it started */}
      <section
        className="about-section"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 40px 80px',
        }}
      >
        <div
          className="glass-card"
          data-accent="blue"
          style={{ padding: 40 }}
        >
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {c.about_history_title}
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              textAlign: 'center',
              maxWidth: 720,
              margin: '0 auto 16px',
            }}
          >
            {c.about_history_p1}
          </p>
          <p
            style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              textAlign: 'center',
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            {c.about_history_p2}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        className="about-section"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 40px 80px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          {c.about_cta_title}
        </h2>
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            marginBottom: 24,
          }}
        >
          {c.about_cta_subtitle}
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
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
              transition: 'var(--transition)',
            }}
          >
            {c.about_cta_primary}
          </Link>
          <Link
            to="/contact"
            style={{
              display: 'inline-block',
              background: 'color-mix(in srgb, var(--purple) 15%, transparent)',
              border: '1px solid color-mix(in srgb, var(--purple) 30%, transparent)',
              color: 'var(--purple)',
              textDecoration: 'none',
              padding: '14px 32px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 16,
              fontWeight: 600,
              transition: 'var(--transition)',
            }}
          >
            {c.about_cta_secondary}
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
