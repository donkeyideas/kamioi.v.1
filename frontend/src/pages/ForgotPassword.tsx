import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AuroraBackground } from '@/components/layout/AuroraBackground'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) {
        throw resetError
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link')
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
      <AuroraBackground />

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
            Reset your password
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

          {success && (
            <div style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              color: '#22C55E',
              fontSize: '14px',
            }}>
              Check your email for a password reset link
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            style={{
              padding: '12px',
              borderRadius: '10px',
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <p style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '13px',
            opacity: 0.6,
          }}>
            <Link to="/login" style={{
              color: '#7C3AED',
              textDecoration: 'none',
              fontWeight: 500,
            }}>
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
