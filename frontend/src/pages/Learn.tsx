import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'

/* -----------------------------------------------
   Topic data
   ----------------------------------------------- */

interface Topic {
  title: string
  description: string
  accent: 'purple' | 'blue' | 'teal' | 'pink'
  icon: React.ReactNode
  gradient: string
}

function GettingStartedIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function RiskIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function AiIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 14h3" />
      <path d="M1 9h3" />
      <path d="M1 14h3" />
    </svg>
  )
}

function SecurityIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  )
}

const TOPICS: Topic[] = [
  {
    title: 'Getting Started',
    description:
      'New to investing? Learn the basics of portfolio management, diversification, and compound growth.',
    accent: 'purple',
    icon: <GettingStartedIcon />,
    gradient: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
  },
  {
    title: 'Understanding Risk',
    description:
      'Learn about risk tolerance, asset allocation, and how to build a portfolio that matches your comfort level.',
    accent: 'blue',
    icon: <RiskIcon />,
    gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
  },
  {
    title: 'AI & Investing',
    description:
      'Discover how machine learning and AI are transforming personal finance and investment strategies.',
    accent: 'teal',
    icon: <AiIcon />,
    gradient: 'linear-gradient(135deg, #06B6D4, #0891B2)',
  },
  {
    title: 'Security & Privacy',
    description:
      'Learn how we protect your data with bank-level encryption, 2FA, and compliance standards.',
    accent: 'pink',
    icon: <SecurityIcon />,
    gradient: 'linear-gradient(135deg, #EC4899, #DB2777)',
  },
]

/* -----------------------------------------------
   FAQ data
   ----------------------------------------------- */

interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is round-up investing?',
    answer:
      'Round-up investing automatically rounds up your everyday purchases to the nearest dollar and invests the spare change. For example, if you buy a coffee for $3.75, the remaining $0.25 is rounded up and invested into your portfolio. Over time, these small amounts accumulate and compound, helping you build wealth without changing your spending habits.',
  },
  {
    question: 'Is my money safe?',
    answer:
      'Yes. Your investments are held in SIPC-insured accounts, which protect securities customers up to $500,000 (including $250,000 for cash claims). We use bank-level 256-bit AES encryption, two-factor authentication, and regular security audits to safeguard your account and personal information.',
  },
  {
    question: 'What are the fees?',
    answer:
      'Kamioi charges a simple flat monthly fee based on your plan. Our Personal plan starts at $1/month for individual accounts. Family plans and Business accounts have their own competitive pricing tiers. There are no hidden fees, no trading commissions, and no withdrawal penalties.',
  },
  {
    question: 'Can I withdraw my money?',
    answer:
      'Yes, you can withdraw your funds at any time with no penalties or lock-up periods. Standard withdrawals typically arrive in your bank account within 3-5 business days. We believe your money should always be accessible when you need it.',
  },
  {
    question: 'How does the AI work?',
    answer:
      'Our AI analyzes market trends, your spending patterns, and risk profile to provide personalized investment recommendations. It continuously monitors your portfolio and rebalances it to maintain your target allocation. The system also identifies opportunities to optimize tax efficiency and maximize returns based on your specific financial goals.',
  },
]

/* -----------------------------------------------
   Accordion item sub-component
   ----------------------------------------------- */

function AccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          gap: '16px',
        }}
      >
        <h4
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.4,
          }}
        >
          {item.question}
        </h4>
        <span
          style={{
            flexShrink: 0,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(124, 58, 237, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 500,
            color: '#7C3AED',
            transition: 'var(--transition)',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          +
        </span>
      </div>
      <div
        style={{
          maxHeight: isOpen ? '400px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 300ms ease, padding 300ms ease',
        }}
      >
        <div style={{ padding: '0 24px 20px' }}>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
            }}
          >
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  )
}

/* -----------------------------------------------
   Responsive styles
   ----------------------------------------------- */

const responsiveStyles = `
  @media (max-width: 768px) {
    .learn-grid {
      grid-template-columns: 1fr !important;
    }
    .learn-section {
      padding: 60px 20px !important;
    }
    .learn-hero {
      padding: 80px 20px 40px !important;
    }
  }
`

/* -----------------------------------------------
   Color map for "Learn more" link gradients
   ----------------------------------------------- */

const accentLinkColors: Record<string, string> = {
  purple: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
  blue: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
  teal: 'linear-gradient(135deg, #06B6D4, #10B981)',
  pink: 'linear-gradient(135deg, #EC4899, #7C3AED)',
}

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function Learn() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const handleToggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index))
  }

  return (
    <PublicLayout>
      <style>{responsiveStyles}</style>

      {/* Hero section */}
      <section
        className="learn-hero"
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
          Learn about{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            investing
          </span>
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
          Resources to help you make informed investment decisions.
        </p>
      </section>

      {/* Topics grid */}
      <section
        className="learn-section"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 40px 80px',
        }}
      >
        <div
          className="learn-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '24px',
          }}
        >
          {TOPICS.map((topic) => (
            <div
              key={topic.title}
              className="glass-card"
              data-accent={topic.accent}
              style={{ padding: '28px' }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: topic.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                {topic.icon}
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
                {topic.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                  marginBottom: '16px',
                }}
              >
                {topic.description}
              </p>

              {/* Learn more link */}
              <Link
                to="#"
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: accentLinkColors[topic.accent],
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Learn more
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ section */}
      <section
        id="faq"
        className="learn-section"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 40px 80px',
        }}
      >
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '32px',
            textAlign: 'center',
          }}
        >
          Frequently asked questions
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem
              key={item.question}
              item={item}
              isOpen={openFaqIndex === index}
              onToggle={() => handleToggleFaq(index)}
            />
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}
