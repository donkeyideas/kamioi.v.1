import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState('individual')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signUp(email, password, name, accountType)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const accountTypes = [
    { value: 'individual', label: 'Individual' },
    { value: 'family', label: 'Family' },
    { value: 'business', label: 'Business' },
  ]

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
          background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)',
          bottom: '10%',
          right: '20%',
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
            Create your account
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
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
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
              placeholder="John Doe"
            />
          </div>

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

          <div style={{ marginBottom: '20px' }}>
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
              minLength={8}
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
              placeholder="Min 8 characters"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '8px',
              opacity: 0.8,
            }}>
              Account Type
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {accountTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setAccountType(type.value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: accountType === type.value
                      ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.3))'
                      : 'var(--surface-input)',
                    border: accountType === type.value
                      ? '1px solid rgba(124,58,237,0.5)'
                      : '1px solid var(--color-border-subtle)',
                    borderRadius: '8px',
                    color: 'inherit',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '13px',
            opacity: 0.6,
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#7C3AED', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
