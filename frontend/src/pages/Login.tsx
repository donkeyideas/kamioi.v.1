import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
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
            Sign in to your account
          </p>
        </div>

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
                background: 'rgba(255,255,255,0.05)',
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

          <div style={{ marginBottom: '24px' }}>
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
                background: 'rgba(255,255,255,0.05)',
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

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading
                ? 'rgba(124,58,237,0.5)'
                : 'linear-gradient(135deg, #7C3AED, #3B82F6)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

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
        </form>
      </div>
    </div>
  )
}
