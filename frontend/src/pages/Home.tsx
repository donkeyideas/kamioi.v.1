import { Link } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'

export default function Home() {
  const { isLight, toggleTheme } = useTheme()

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background blobs */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
          top: '-200px',
          left: '-100px',
          animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
          bottom: '-150px',
          right: '-100px',
          animation: 'float 10s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)',
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'float 12s ease-in-out infinite',
        }} />
      </div>

      {/* Navigation */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 40px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <span style={{
          fontSize: '24px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Kamioi
        </span>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {isLight ? 'Dark' : 'Light'}
          </button>
          <Link
            to="/login"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              opacity: 0.8,
            }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
              color: '#fff',
              textDecoration: 'none',
              padding: '10px 24px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '800px',
        margin: '0 auto',
        padding: '80px 40px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '24px',
        }}>
          Invest Your{' '}
          <span style={{
            background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Spare Change
          </span>
        </h1>

        <p style={{
          fontSize: '18px',
          opacity: 0.7,
          maxWidth: '560px',
          margin: '0 auto 40px',
          lineHeight: 1.6,
        }}>
          Kamioi automatically rounds up your purchases and invests the difference.
          Build wealth effortlessly with AI-powered micro-investing.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link
            to="/register"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
              color: '#fff',
              textDecoration: 'none',
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            Start Investing
          </Link>
          <Link
            to="/login"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'inherit',
              textDecoration: 'none',
              padding: '14px 32px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 500,
            }}
          >
            Sign In
          </Link>
        </div>
      </main>

      {/* Float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
    </div>
  )
}
