import { useHomeContent } from '@/hooks/useHomeContent'

/**
 * AppDownloadCard - Shows App Store / Google Play download badges.
 * Uses shared useHomeContent hook. Always shows (with "Coming Soon" when URLs are #).
 */
export function AppDownloadCard() {
  const { content } = useHomeContent()

  const appLive = content.app_store_url && content.app_store_url !== '#'
  const playLive = content.play_store_url && content.play_store_url !== '#'
  const anyComingSoon = !appLive || !playLive

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--blue)' }}>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12" y2="18" />
        </svg>
        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Get the Mobile App
        </span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
        {anyComingSoon
          ? 'The Kamioi mobile app is coming soon to iOS and Android.'
          : 'Invest on the go. Download Kamioi for iOS and Android to track your portfolio anywhere.'}
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <a
          href={appLive ? content.app_store_url : undefined}
          onClick={!appLive ? (e: React.MouseEvent) => e.preventDefault() : undefined}
          target={appLive ? '_blank' : undefined}
          rel="noopener noreferrer"
          aria-label="Download on the App Store"
          style={{ display: 'inline-block', opacity: appLive ? 1 : 0.4, cursor: appLive ? 'pointer' : 'default', transition: 'transform 200ms' }}
          onMouseEnter={e => { if (appLive) e.currentTarget.style.transform = 'scale(1.05)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" style={{ display: 'block', height: '40px' }} />
        </a>
        <a
          href={playLive ? content.play_store_url : undefined}
          onClick={!playLive ? (e: React.MouseEvent) => e.preventDefault() : undefined}
          target={playLive ? '_blank' : undefined}
          rel="noopener noreferrer"
          aria-label="Get it on Google Play"
          style={{ display: 'inline-block', opacity: playLive ? 1 : 0.4, cursor: playLive ? 'pointer' : 'default', transition: 'transform 200ms' }}
          onMouseEnter={e => { if (playLive) e.currentTarget.style.transform = 'scale(1.05)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" style={{ display: 'block', height: '58px', marginTop: '-9px', marginBottom: '-9px' }} />
        </a>
      </div>
    </div>
  )
}
