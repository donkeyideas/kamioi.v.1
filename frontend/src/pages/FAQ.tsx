import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public/PublicLayout.tsx'
import { SEO } from '@/components/common/SEO'
import { usePageContent } from '@/hooks/usePageContent'

/* -----------------------------------------------
   Content defaults (admin-editable)
   ----------------------------------------------- */

const DEFAULTS = {
  faq_hero_title: 'Frequently Asked Questions',
  faq_hero_subtitle: 'Everything you need to know about Kamioi. Can\'t find what you\'re looking for? Contact our support team.',
  faq_q1: 'What is round-up investing?',
  faq_a1: 'Round-up investing adds a fixed whole-dollar amount you choose — like $1, $2, or $3 — to every purchase and invests it automatically. For example, if you set your round-up to $1 and buy a coffee for $3.75, Kamioi invests $1.00 into your portfolio. Over time, these consistent amounts accumulate and compound, helping you build wealth without changing your spending habits.',
  faq_q2: 'Is my money safe?',
  faq_a2: 'Yes. Your investments are held in SIPC-insured accounts, which protect securities customers up to $500,000 (including $250,000 for cash claims). We use bank-level 256-bit AES encryption, two-factor authentication, and regular security audits to safeguard your account and personal information.',
  faq_q3: 'What are the fees?',
  faq_a3: 'Kamioi charges a simple flat monthly fee based on your plan. Our Individual plan is great for solo investors, Family plans let you invest together, and Business accounts have enterprise features. There are no hidden fees, no trading commissions, and no withdrawal penalties.',
  faq_q4: 'Can I withdraw my money?',
  faq_a4: 'Yes, you can withdraw your funds at any time with no penalties or lock-up periods. Standard withdrawals typically arrive in your bank account within 3-5 business days. We believe your money should always be accessible when you need it.',
  faq_q5: 'How does the AI work?',
  faq_a5: 'Our AI analyzes your spending patterns to match purchases with relevant stocks. Buy coffee at Starbucks, and your round-up goes toward Starbucks stock. The system continuously monitors your portfolio and provides personalized insights to help you make informed investment decisions.',
  faq_q6: 'How do I link my bank account?',
  faq_a6: 'After creating your account, go to Settings and click "Link Bank Account." We use secure bank-level connections to verify your account. Your banking credentials are never stored on our servers — they are processed through encrypted, tokenized connections.',
  faq_q7: 'Can I change my round-up amount?',
  faq_a7: 'Absolutely. You can change your round-up amount at any time from your dashboard settings. Choose any whole-dollar amount — $1, $2, $3, or more. Changes take effect on your next purchase.',
  faq_q8: 'What stocks will I own?',
  faq_a8: 'Kamioi matches your purchases to relevant publicly traded companies. When you buy from a brand, your round-up is invested in that company\'s stock. You own real fractional shares in your portfolio, and you can view your holdings anytime from your dashboard.',
}

const FAQ_COUNT = 8

/* -----------------------------------------------
   Accordion component
   ----------------------------------------------- */

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="glass-card"
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', gap: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {question}
        </h3>
        <span
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'color-mix(in srgb, var(--purple) 15%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--purple)',
            transition: 'var(--transition)',
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          +
        </span>
      </div>
      <div style={{ maxHeight: isOpen ? 400 : 0, overflow: 'hidden', transition: 'max-height 300ms ease, padding 300ms ease' }}>
        <div style={{ padding: '0 24px 20px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {answer}
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
    .faq-section { padding: 60px 20px !important; }
    .faq-hero { padding: 80px 20px 40px !important; }
  }
`

/* -----------------------------------------------
   Component
   ----------------------------------------------- */

export default function FAQ() {
  const { content: c } = usePageContent(DEFAULTS)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  // Build FAQ items from content keys
  const faqItems: { question: string; answer: string }[] = []
  for (let i = 1; i <= FAQ_COUNT; i++) {
    const q = c[`faq_q${i}` as keyof typeof DEFAULTS]
    const a = c[`faq_a${i}` as keyof typeof DEFAULTS]
    if (q && a) faqItems.push({ question: q, answer: a })
  }

  return (
    <PublicLayout>
      <SEO
        title="FAQ — Frequently Asked Questions About Kamioi"
        description="Find answers to common questions about Kamioi micro-investing: round-ups, fees, security, withdrawals, AI stock matching, and more."
        canonical="https://kamioi.com/faq"
      />
      {/* FAQPage schema for AEO — optimizes for featured snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
              },
            })),
          }),
        }}
      />
      <style>{responsiveStyles}</style>

      {/* Hero */}
      <section
        className="faq-hero"
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
          Frequently Asked{' '}
          <span
            style={{
              backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Questions
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          {c.faq_hero_subtitle}
        </p>
      </section>

      {/* FAQ accordion */}
      <section className="faq-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 800, margin: '0 auto' }}>
          {faqItems.map((item, index) => (
            <AccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex((prev) => (prev === index ? null : index))}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="faq-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px 80px', textAlign: 'center' }}>
        <div className="glass-card" data-accent="blue" style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            Still have questions?
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            Our support team is here to help. We typically respond within 24 hours.
          </p>
          <Link
            to="/contact"
            style={{
              display: 'inline-block',
              background: 'var(--gradient-primary, linear-gradient(135deg, #3B82F6, #06B6D4))',
              color: '#fff',
              textDecoration: 'none',
              padding: '14px 32px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Contact Support
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
