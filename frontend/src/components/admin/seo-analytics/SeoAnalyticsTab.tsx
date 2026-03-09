import { useState } from 'react'
import { SeoTab } from './SeoTab'
import { GeoTab } from './GeoTab'
import { AeoTab } from './AeoTab'
import { CroTab } from './CroTab'

const TABS = [
  { key: 'seo', label: 'SEO', desc: 'Search Engine Optimization' },
  { key: 'aeo', label: 'AEO', desc: 'Answer Engine Optimization' },
  { key: 'geo', label: 'GEO', desc: 'Generative Engine Optimization' },
  { key: 'cro', label: 'CRO', desc: 'Conversion Rate Optimization' },
] as const

type TabKey = typeof TABS[number]['key']

export function SeoAnalyticsTab() {
  const [active, setActive] = useState<TabKey>('seo')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: 700, transition: 'all 200ms ease',
              background: active === t.key ? 'linear-gradient(135deg, #7C3AED, #3B82F6)' : 'var(--dark-card, var(--surface-input))',
              color: active === t.key ? '#fff' : 'var(--text-secondary)',
              boxShadow: active === t.key ? '0 4px 16px rgba(124,58,237,0.3)' : 'none',
            }}
          >
            <div>{t.label}</div>
            <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.8, marginTop: '2px' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === 'seo' && <SeoTab />}
      {active === 'aeo' && <AeoTab />}
      {active === 'geo' && <GeoTab />}
      {active === 'cro' && <CroTab />}
    </div>
  )
}
