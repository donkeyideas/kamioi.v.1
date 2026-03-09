import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * AppDownloadCard - Shows App Store / Google Play download badges.
 * Fetches URLs from admin_settings. Renders nothing if no URLs are set.
 */
export function AppDownloadCard() {
  const [appStoreUrl, setAppStoreUrl] = useState('')
  const [playStoreUrl, setPlayStoreUrl] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['app_store_url', 'play_store_url'])
      .then(({ data }) => {
        for (const s of data ?? []) {
          if (s.setting_key === 'app_store_url' && s.setting_value) setAppStoreUrl(s.setting_value)
          if (s.setting_key === 'play_store_url' && s.setting_value) setPlayStoreUrl(s.setting_value)
        }
        setLoaded(true)
      })
  }, [])

  if (!loaded || (!appStoreUrl && !playStoreUrl)) return null

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
        Invest on the go. Download Kamioi for iOS and Android to track your portfolio anywhere.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {appStoreUrl && (
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download on the App Store"
            style={{ transition: 'transform 200ms ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <svg width="135" height="45" viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="180" height="60" rx="10" fill="#000"/>
              <text x="65" y="22" fill="#fff" fontSize="9" fontFamily="system-ui, sans-serif" fontWeight="400">Download on the</text>
              <text x="65" y="40" fill="#fff" fontSize="17" fontFamily="system-ui, sans-serif" fontWeight="600">App Store</text>
              <g transform="translate(18, 12)" fill="#fff"><path d="M28.9 27.5c-.1 3.1 2.5 4.6 2.6 4.6-.1.3-0.4 1.4-1.3 2.7-.8 1.2-1.6 2.3-2.9 2.4-1.3.1-1.7-.7-3.1-.7-1.5 0-1.9.7-3.1.8-1.2 0-2.2-1.3-3-2.5-1.6-2.4-2.9-6.8-1.2-9.7.8-1.5 2.3-2.4 3.9-2.4 1.2 0 2.4.8 3.1.8.8 0 2.2-1 3.7-.9.6 0 2.4.3 3.5 2-0.1.1-2.1 1.2-2.2 3.9zM26.1 20.9c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"/></g>
            </svg>
          </a>
        )}
        {playStoreUrl && (
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get it on Google Play"
            style={{ transition: 'transform 200ms ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <svg width="135" height="45" viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="180" height="60" rx="10" fill="#000"/>
              <text x="65" y="22" fill="#fff" fontSize="9" fontFamily="system-ui, sans-serif" fontWeight="400">GET IT ON</text>
              <text x="65" y="40" fill="#fff" fontSize="16" fontFamily="system-ui, sans-serif" fontWeight="600">Google Play</text>
              <g transform="translate(16, 13)"><path d="M4 2.5l16.5 12.5L4 27.5V2.5z" fill="#34A853"/><path d="M4 2.5l20 12.5-3.5 2.7L4 7.5V2.5z" fill="#FBBC04"/><path d="M4 27.5l16.5-10.2-3.5-2.7L4 22.5v5z" fill="#EA4335"/><path d="M20.5 15L24 17.5 20.5 20l-3.5-2.5 3.5-2.5z" fill="#4285F4"/></g>
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}
