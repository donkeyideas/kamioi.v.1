import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PublicLayout } from '@/components/public'
import { GlassCard, Button, Input, Textarea } from '@/components/ui'
import { SEO } from '@/components/common/SEO.tsx'
import { usePageContent } from '@/hooks/usePageContent'

/* ------------------------------------------------------------------ */
/*  Content defaults                                                   */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  contact_hero_title: 'Contact Us',
  contact_hero_subtitle: 'Have a question or feedback? We would love to hear from you.',
  contact_demo_title: 'Request a Demo',
  contact_demo_subtitle: 'Fill out the form below and our team will get you set up with demo access.',
  contact_submit_text: 'Send Message',
  contact_demo_submit: 'Submit Demo Request',
  contact_success: 'Message sent successfully. We will get back to you soon.',
  contact_demo_success: 'Demo request submitted! Our team will review and send you access shortly.',
  contact_info_title: 'Get in touch',
  contact_email: 'info@donkeyideas.com',
  contact_response: 'We typically respond within 24 hours',
  contact_hours: 'Monday - Friday, 9am - 6pm EST',
  contact_support_title: 'Looking for support?',
  contact_support_desc: 'Check out our frequently asked questions for quick answers.',
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

const twoColStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '55% 1fr',
  gap: 32,
  alignItems: 'start',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function submitContactMessage(data: {
  name: string
  email: string
  subject: string
  message: string
}): Promise<void> {
  const { supabase } = await import('@/lib/supabase')
  const { error } = await supabase
    .from('contact_messages')
    .insert({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      status: 'new',
    })

  if (error) {
    throw error
  }
}

/* ------------------------------------------------------------------ */
/*  Contact info card                                                  */
/* ------------------------------------------------------------------ */

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Contact() {
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('type') === 'demo'
  const { content: c } = usePageContent(DEFAULTS)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState(isDemo ? 'Demo Request' : '')
  const [message, setMessage] = useState(
    isDemo ? 'I would like to request a demo of the Kamioi platform.' : '',
  )
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    setErrorMsg('')

    try {
      await submitContactMessage({ name, email, subject, message })
      setStatus('success')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (err: unknown) {
      setStatus('error')
      const msg =
        err instanceof Error ? err.message : 'Something went wrong. Please try again later.'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <SEO
        title="Contact"
        description="Get in touch with the Kamioi team. We typically respond within 24 hours."
      />

      <section style={sectionStyle}>
        {/* Hero */}
        <div style={heroStyle}>
          <h1 style={h1Style}>{isDemo ? c.contact_demo_title : c.contact_hero_title}</h1>
          <p style={subtitleStyle}>
            {isDemo ? c.contact_demo_subtitle : c.contact_hero_subtitle}
          </p>
        </div>

        {/* Two-column layout */}
        <div style={twoColStyle} className="contact-grid">
          {/* Left: form */}
          <GlassCard accent="purple">
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Input
                  label="Name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Subject"
                  placeholder="What is this about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
                <Textarea
                  label="Message"
                  placeholder="Tell us more..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  style={{ minHeight: 140 }}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                >
                  {isDemo ? c.contact_demo_submit : c.contact_submit_text}
                </Button>

                {/* Feedback */}
                {status === 'success' && (
                  <p
                    style={{
                      fontSize: 14,
                      color: '#06B6D4',
                      textAlign: 'center',
                      margin: 0,
                    }}
                  >
                    {isDemo ? c.contact_demo_success : c.contact_success}
                  </p>
                )}
                {status === 'error' && (
                  <p
                    style={{
                      fontSize: 14,
                      color: '#EF4444',
                      textAlign: 'center',
                      margin: 0,
                    }}
                  >
                    {errorMsg}
                  </p>
                )}
              </div>
            </form>
          </GlassCard>

          {/* Right: info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <GlassCard accent="blue">
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 20,
                }}
              >
                {c.contact_info_title}
              </h2>
              <InfoItem label="Email" value={c.contact_email} />
              <InfoItem label="Response time" value={c.contact_response} />
              <InfoItem label="Office hours" value={c.contact_hours} />
            </GlassCard>

            <GlassCard accent="teal">
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: 8,
                }}
              >
                {c.contact_support_title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  margin: '0 0 16px',
                  lineHeight: 1.6,
                }}
              >
                {c.contact_support_desc}
              </p>
              <Link
                to="/learn#faq"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#06B6D4',
                  textDecoration: 'none',
                }}
              >
                Visit FAQ
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PublicLayout>
  )
}
