import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEO } from '@/components/common/SEO'
import { getDemoSession, setDemoSession } from './useDemoSession'
import { validateDemoCode, logDemoVisit } from '@/services/api'

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface-card)',
  backdropFilter: 'blur(16px)',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '16px',
  padding: '32px',
  cursor: 'pointer',
  transition: 'transform 0.2s, border-color 0.2s',
  textAlign: 'center',
}

const cards = [
  {
    key: 'individual',
    path: '/demo/individual',
    title: 'Individual',
    subtitle: 'Personal micro-investing dashboard',
    description: 'See how your everyday purchases generate round-ups that get invested into stocks you already shop with.',
    color: '#7C3AED',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    key: 'family',
    path: '/demo/family',
    title: 'Family',
    subtitle: 'Shared family investing dashboard',
    description: 'Manage your family\'s investments together. Track multiple members, shared goals, and combined portfolio growth.',
    color: '#3B82F6',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: 'business',
    path: '/demo/business',
    title: 'Business',
    subtitle: 'Corporate investing dashboard',
    description: 'Turn business expenses into investments. Manage team members, generate reports, and track company portfolio performance.',
    color: '#06B6D4',
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.5">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
]

export default function DemoSelector() {
  const navigate = useNavigate()
  const [session, setSession] = useState(getDemoSession())
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Log return visit on mount if session exists
  useEffect(() => {
    if (session) {
      logDemoVisit(session.session_token, session.email, 'selector')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: apiErr } = await validateDemoCode(code, email)

    if (apiErr || !data) {
      setError(apiErr || 'Failed to validate demo code')
      setLoading(false)
      return
    }

    setDemoSession(data)
    setSession(data)
    setLoading(false)
  }

  /* ---- Gate Form ---- */
  if (!session) {
    return (
      <>
        <SEO title="Demo Access" description="Enter your demo code to access Kamioi's interactive dashboards." />
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          position: 'relative',
        }}>
          {/* Background blobs */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', top: '-10%', left: '10%' }} />
            <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', bottom: '5%', right: '15%' }} />
          </div>

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '440px', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{
                fontSize: 'clamp(28px, 4vw, 38px)',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: '12px',
                background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Access Demo
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Enter your demo code and email to explore our interactive dashboards.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{
              background: 'var(--color-surface-card)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '16px',
              padding: '32px',
            }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border-subtle)',
                    background: 'var(--color-surface-input, var(--color-surface-base))',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#7C3AED'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border-subtle)'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Demo Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="DEMO-XXXXXX"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border-subtle)',
                    background: 'var(--color-surface-input, var(--color-surface-base))',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#7C3AED'}
                  onBlur={e => e.target.style.borderColor = 'var(--color-border-subtle)'}
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#EF4444',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? 'Validating...' : 'Access Demo'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Don't have a code?{' '}
                <a href="/contact" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 600 }}>Request access</a>
                {' '}or{' '}
                <a href="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>sign in</a>
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* ---- Dashboard Selector (validated) ---- */
  return (
    <>
      <SEO title="Demo" description="Try Kamioi's demo dashboards. Explore Individual, Family, and Business investing dashboards with sample data." />
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
      }}>
        {/* Background blobs */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', top: '-10%', left: '10%' }} />
          <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', bottom: '5%', right: '15%' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '900px', width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Try Kamioi Demo
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
              Explore our interactive dashboards with sample data. Nothing touches any real system.
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {cards.map(card => (
              <div
                key={card.key}
                style={cardStyle}
                onClick={() => navigate(card.path)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = card.color
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-subtle)'
                }}
              >
                <div style={{ marginBottom: '16px' }}>{card.icon}</div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: card.color, marginBottom: '4px' }}>
                  {card.title}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {card.subtitle}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                  {card.description}
                </p>
                <div style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  background: `linear-gradient(135deg, ${card.color}22, ${card.color}11)`,
                  border: `1px solid ${card.color}44`,
                  borderRadius: '10px',
                  color: card.color,
                  fontSize: '14px',
                  fontWeight: 600,
                }}>
                  Launch Demo
                </div>
              </div>
            ))}
          </div>

          {/* Footer links */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Ready for the real thing?{' '}
              <a href="/register" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 600 }}>Create an account</a>
              {' '}or{' '}
              <a href="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>sign in</a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
