import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { SEO } from '@/components/common/SEO'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mfaCode, setMfaCode] = useState(['', '', '', '', '', ''])
  const mfaInputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [signinEnabled, setSigninEnabled] = useState(true)
  const [signupEnabled, setSignupEnabled] = useState(true)
  const [demoMode, setDemoMode] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const { signIn, verifyMfa, mfaRequired, cancelMfa } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.from('admin_settings').select('setting_key, setting_value')
      .in('setting_key', ['signin_enabled', 'signup_enabled', 'demo_mode'])
      .then(({ data }) => {
        data?.forEach((s) => {
          if (s.setting_key === 'signin_enabled') setSigninEnabled(s.setting_value !== 'false')
          if (s.setting_key === 'signup_enabled') setSignupEnabled(s.setting_value !== 'false')
          if (s.setting_key === 'demo_mode') setDemoMode(s.setting_value === 'true')
        })
        setSettingsLoaded(true)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signinEnabled) {
      setError('Sign-in is currently disabled by the administrator.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password)
      if (result && typeof result === 'object' && 'mfaRequired' in result) {
        setLoading(false)
        return
      }
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaDigit = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const digit = value.slice(-1)
    setMfaCode(prev => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < 5) {
      mfaInputsRef.current[index + 1]?.focus()
    }
  }, [])

  const handleMfaKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !mfaCode[index] && index > 0) {
      mfaInputsRef.current[index - 1]?.focus()
    }
  }, [mfaCode])

  const handleMfaPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const digits = pasted.split('')
    setMfaCode(prev => {
      const next = [...prev]
      digits.forEach((d, i) => { next[i] = d })
      return next
    })
    const focusIdx = Math.min(digits.length, 5)
    mfaInputsRef.current[focusIdx]?.focus()
  }, [])

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = mfaCode.join('')
    if (code.length !== 6) return
    setError('')
    setLoading(true)

    try {
      await verifyMfa(code)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code')
      setMfaCode(['', '', '', '', '', ''])
      mfaInputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleCancelMfa = async () => {
    await cancelMfa()
    setMfaCode(['', '', '', '', '', ''])
    setError('')
  }

  return (
    <>
    <SEO title="Sign In" description="Sign in to your Kamioi account to manage your micro-investing portfolio." noindex />
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
    }}>
      {/* Background blob */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          top: '20%',
          left: '30%',
        }} />
      </div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        opacity: settingsLoaded ? 1 : 0,
        transition: 'opacity 0.2s ease',
        width: '100%',
        maxWidth: '400px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link to="/" style={{
            fontSize: '28px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textDecoration: 'none',
          }}>
            Kamioi
          </Link>
          <p style={{ marginTop: '8px', opacity: 0.6, fontSize: '14px' }}>
            {signinEnabled ? 'Sign in to your account' : 'Welcome to Kamioi'}
          </p>
        </div>

        {!signinEnabled && !demoMode && (
          <div style={{
            background: 'var(--color-surface-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', opacity: 0.6 }}>
              Sign-in is currently unavailable. Please try again later.
            </p>
          </div>
        )}

        {signinEnabled && mfaRequired ? (
          /* MFA Verification Form */
          <form onSubmit={handleMfaSubmit} style={{
            background: 'var(--color-surface-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Two-Factor Authentication</h2>
              <p style={{ fontSize: 13, opacity: 0.6 }}>Enter the 6-digit code from your authenticator app</p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#EF4444',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {mfaCode.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { mfaInputsRef.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleMfaDigit(i, e.target.value)}
                  onKeyDown={e => handleMfaKeyDown(i, e)}
                  onPaste={i === 0 ? handleMfaPaste : undefined}
                  autoFocus={i === 0}
                  style={{
                    width: 44,
                    height: 52,
                    textAlign: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    background: 'var(--surface-input)',
                    border: `1px solid ${digit ? '#7C3AED' : 'var(--color-border-subtle)'}`,
                    borderRadius: 10,
                    color: 'inherit',
                    outline: 'none',
                    transition: 'border-color 150ms',
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || mfaCode.join('').length !== 6}
              style={{
                width: '100%',
                padding: '12px',
                background: (loading || mfaCode.join('').length !== 6)
                  ? 'rgba(124,58,237,0.5)'
                  : 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (loading || mfaCode.join('').length !== 6) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <button
              type="button"
              onClick={handleCancelMfa}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginTop: 8,
              }}
            >
              Back to login
            </button>
          </form>
        ) : signinEnabled ? (
          /* Login Form */
          <form onSubmit={handleSubmit} style={{
            background: 'var(--color-surface-card)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#EF4444',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '6px',
                opacity: 0.8,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                placeholder="you@example.com"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '6px',
                opacity: 0.8,
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'var(--surface-input)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
                placeholder="Enter your password"
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <Link to="/forgot-password" style={{
                fontSize: '13px',
                color: '#7C3AED',
                textDecoration: 'none',
                fontWeight: 500,
              }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !signinEnabled}
              style={{
                width: '100%',
                padding: '12px',
                background: (loading || !signinEnabled)
                  ? 'rgba(124,58,237,0.5)'
                  : 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (loading || !signinEnabled) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {signupEnabled && (
              <p style={{
                textAlign: 'center',
                marginTop: '20px',
                fontSize: '13px',
                opacity: 0.6,
              }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 500 }}>
                  Sign up
                </Link>
              </p>
            )}
          </form>
        ) : null}

        {/* Demo option */}
        {demoMode && <div style={{
          marginTop: '16px',
          background: 'var(--color-surface-card)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '12px',
          padding: '16px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', opacity: 0.7, margin: '0 0 10px' }}>
            Want to explore first?
          </p>
          <Link
            to="/demo"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))',
              border: '1px solid rgba(124,58,237,0.3)',
              borderRadius: '10px',
              color: '#A78BFA',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Try Interactive Demo
          </Link>
        </div>}
      </div>
    </div>
    </>
  )
}
