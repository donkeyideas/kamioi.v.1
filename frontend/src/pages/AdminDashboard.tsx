import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const { toggleTheme, isLight } = useTheme()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: 'var(--color-surface-sidebar)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid var(--color-border-subtle)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <span style={{
          fontSize: '22px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '4px',
          padding: '0 8px',
        }}>
          Kamioi
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#7C3AED',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          padding: '0 8px',
          marginBottom: '32px',
        }}>
          Admin
        </span>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            'Overview', 'Users', 'Transactions', 'LLM Center',
            'Subscriptions', 'Financial', 'Content', 'SEO/GEO',
            'Database', 'Settings',
          ].map((item, i) => (
            <div
              key={item}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: i === 0 ? 600 : 400,
                background: i === 0
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.2))'
                  : 'transparent',
                color: i === 0 ? '#fff' : 'inherit',
                opacity: i === 0 ? 1 : 0.6,
                cursor: 'pointer',
              }}
            >
              {item}
            </div>
          ))}
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--color-border-subtle)',
              color: 'inherit',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {isLight ? 'Dark Mode' : 'Light Mode'}
          </button>
          <button
            onClick={signOut}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#EF4444',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
          Admin Dashboard
        </h1>
        <p style={{ opacity: 0.6, fontSize: '14px', marginBottom: '32px' }}>
          Platform management and monitoring
        </p>

        {/* KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {[
            { label: 'Total Users', value: '0' },
            { label: 'Revenue This Month', value: '$0.00' },
            { label: 'Pending Mappings', value: '0' },
            { label: 'System Health', value: 'OK' },
          ].map(card => (
            <div key={card.label} style={{
              background: 'var(--color-surface-card)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '14px',
              padding: '20px',
            }}>
              <p style={{ fontSize: '13px', opacity: 0.5, marginBottom: '8px' }}>
                {card.label}
              </p>
              <p style={{ fontSize: '28px', fontWeight: 700 }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <p style={{ opacity: 0.4, fontSize: '13px' }}>
          Admin modules will be built in Phase 7.
        </p>
      </main>
    </div>
  )
}
