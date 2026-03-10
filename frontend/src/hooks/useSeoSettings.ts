import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface SeoSettings {
  site_title: string
  meta_description: string
  keywords: string
  og_image_url: string
  twitter_handle: string
  google_analytics_id: string
  facebook_pixel_id: string
}

const DEFAULTS: SeoSettings = {
  site_title: 'Kamioi',
  meta_description: 'Kamioi adds your chosen round-up amount to every purchase and invests it into real stocks. AI-powered micro-investing for everyone.',
  keywords: 'micro-investing, round-ups, spare change investing, stock investing, fintech, AI investing',
  og_image_url: '',
  twitter_handle: '',
  google_analytics_id: '',
  facebook_pixel_id: '',
}

let cachedSettings: SeoSettings | null = null

export function useSeoSettings(): { seoSettings: SeoSettings; loading: boolean } {
  const [settings, setSettings] = useState<SeoSettings>(cachedSettings ?? DEFAULTS)
  const [loading, setLoading] = useState(!cachedSettings)

  useEffect(() => {
    if (cachedSettings) return
    supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .eq('setting_type', 'seo')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const obj: Record<string, string> = {}
          for (const s of data) {
            if (s.setting_value) obj[s.setting_key] = s.setting_value
          }
          const merged = { ...DEFAULTS }
          for (const key of Object.keys(DEFAULTS) as (keyof SeoSettings)[]) {
            if (obj[key]) merged[key] = obj[key]
          }
          cachedSettings = merged
          setSettings(merged)
        } else {
          cachedSettings = DEFAULTS
        }
        setLoading(false)
      })
  }, [])

  return { seoSettings: settings, loading }
}

export { DEFAULTS as SEO_DEFAULTS }
