import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults (admin-editable)
   ----------------------------------------------- */

const DEFAULTS = {
  tos_hero_title: 'Terms of Service',
  tos_hero_subtitle: 'Please read these terms carefully before using Kamioi. By creating an account, you agree to be bound by these terms.',
  tos_effective_date: 'March 1, 2026',
  tos_section_1_title: 'Account Eligibility',
  tos_section_1_desc: 'You must be at least 18 years old and a legal resident of the United States to open a Kamioi investment account. By creating an account, you confirm that all information provided is accurate and complete. We reserve the right to verify your identity and may request additional documentation for compliance purposes.',
  tos_section_2_title: 'Investment Services',
  tos_section_2_desc: 'Kamioi provides automated micro-investing services through round-up transactions. All investments are made in fractional shares of publicly traded companies. Past performance does not guarantee future results. All investments carry risk, including the possible loss of principal. Kamioi does not provide personalized financial advice.',
  tos_section_3_title: 'Fees & Billing',
  tos_section_3_desc: 'You agree to pay the monthly subscription fee associated with your chosen plan. Fees are billed automatically and may be updated with 30 days advance notice. There are no trading commissions, withdrawal penalties, or hidden fees. You can cancel your subscription at any time from your account settings.',
  tos_section_4_title: 'User Responsibilities',
  tos_section_4_desc: 'You are responsible for maintaining the security of your account credentials, ensuring sufficient funds in your linked bank account for round-up transactions, providing accurate personal and financial information, and complying with all applicable laws and regulations regarding your investment account.',
  tos_section_5_title: 'Intellectual Property',
  tos_section_5_desc: 'All content, features, and functionality of the Kamioi platform — including the AI matching system, user interface, logos, and documentation — are owned by Kamioi and protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without written permission.',
  tos_section_6_title: 'Limitation of Liability',
  tos_section_6_desc: 'Kamioi is not liable for investment losses, market fluctuations, or trading delays beyond our control. We provide our services "as is" and make no guarantees regarding investment returns. Our total liability is limited to the fees you have paid in the twelve months preceding any claim. This does not affect your statutory rights.',
  tos_section_7_title: 'Termination',
  tos_section_7_desc: 'You may close your account at any time. Upon closure, any remaining investments will be liquidated and funds transferred to your linked bank account within 5-7 business days. We may suspend or terminate accounts that violate these terms, engage in fraudulent activity, or fail to comply with regulatory requirements.',
  tos_section_8_title: 'Dispute Resolution',
  tos_section_8_desc: 'Any disputes arising from these terms or your use of Kamioi will be resolved through binding arbitration in accordance with the American Arbitration Association rules. You agree to resolve disputes individually and waive any right to participate in class action lawsuits. This agreement is governed by the laws of the State of Delaware.',
  tos_cta_heading: 'Have questions about our terms?',
  tos_cta_subtext: 'Our team is happy to clarify any part of our Terms of Service.',
}

/* -----------------------------------------------
   Icons
   ----------------------------------------------- */

function EligibilityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

function InvestmentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function FeesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function ResponsibilityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function LiabilityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function TerminationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function DisputeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

/* -----------------------------------------------
   Section data
   ----------------------------------------------- */

const SECTIONS = [
  { key: 'section_1' as const, icon: <EligibilityIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #7C3AED, #6D28D9))', accent: 'purple' as const },
  { key: 'section_2' as const, icon: <InvestmentIcon />, gradient: 'var(--gradient-icon-blue, linear-gradient(135deg, #3B82F6, #2563EB))', accent: 'blue' as const },
  { key: 'section_3' as const, icon: <FeesIcon />, gradient: 'var(--gradient-icon-teal, linear-gradient(135deg, #06B6D4, #0891B2))', accent: 'teal' as const },
  { key: 'section_4' as const, icon: <ResponsibilityIcon />, gradient: 'var(--gradient-icon-pink, linear-gradient(135deg, #EC4899, #DB2777))', accent: 'pink' as const },
  { key: 'section_5' as const, icon: <IpIcon />, gradient: 'linear-gradient(135deg, #10B981, #059669)', accent: 'teal' as const },
  { key: 'section_6' as const, icon: <LiabilityIcon />, gradient: 'var(--gradient-icon-amber, linear-gradient(135deg, #F59E0B, #D97706))', accent: 'blue' as const },
  { key: 'section_7' as const, icon: <TerminationIcon />, gradient: 'var(--gradient-icon-red, linear-gradient(135deg, #EF4444, #DC2626))', accent: 'pink' as const },
  { key: 'section_8' as const, icon: <DisputeIcon />, gradient: 'var(--gradient-icon-purple, linear-gradient(135deg, #8B5CF6, #7C3AED))', accent: 'purple' as const },
]

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .tos-section { padding: 60px 20px !important; }
    .tos-hero { padding: 80px 20px 40px !important; }
    .tos-grid { grid-template-columns: 1fr !important; }
  }
`

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function TermsOfService() {
  const { content: c } = usePageContent(DEFAULTS)

  return (
    <PublicLayout>
      <SEO
        title="Terms of Service — Kamioi Investment Platform"
        description="Read the Kamioi Terms of Service. Understand your rights, responsibilities, fees, and how our micro-investing platform works."
        canonical="https://kamioi.com/terms-of-service"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Kamioi Terms of Service',
            description: c.tos_hero_subtitle,
            url: 'https://kamioi.com/terms-of-service',
            isPartOf: { '@id': 'https://kamioi.com/#website' },
          }),
        }}
      />
      <style>{responsiveStyles}</style>

      {/* Hero */}
      <section
        className="tos-hero"
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
          Terms of{' '}
          <span
            style={{
              backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Service
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
          {c.tos_hero_subtitle}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
          Effective date: {c.tos_effective_date}
        </p>
      </section>

      {/* TOS sections */}
      <section className="tos-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div className="tos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {SECTIONS.map((sec) => (
            <div key={sec.key} className="glass-card" data-accent={sec.accent} style={{ padding: 28 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: sec.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                {sec.icon}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {c[`tos_${sec.key}_title` as keyof typeof DEFAULTS]}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {c[`tos_${sec.key}_desc` as keyof typeof DEFAULTS]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="tos-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          {c.tos_cta_heading}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {c.tos_cta_subtext}
        </p>
        <Link
          to="/contact"
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
          Contact Us
        </Link>
      </section>
    </PublicLayout>
  )
}
