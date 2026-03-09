import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface HomeContent {
  hero_heading: string
  hero_subheading: string
  hero_cta_text: string
  hero_cta_link: string
  feature_1: string
  feature_1_desc: string
  feature_2: string
  feature_2_desc: string
  feature_3: string
  feature_3_desc: string
  features_heading: string
  step_1_title: string
  step_1_desc: string
  step_2_title: string
  step_2_desc: string
  step_3_title: string
  step_3_desc: string
  steps_heading: string
  stat_1_value: string
  stat_1_label: string
  stat_2_value: string
  stat_2_label: string
  stat_3_value: string
  stat_3_label: string
  stat_4_value: string
  stat_4_label: string
  cta_heading: string
  cta_subtext: string
  cta_button_text: string
  app_store_url: string
  play_store_url: string
  app_section_heading: string
  app_section_subtext: string
  footer_company: string
  footer_tagline: string
  footer_copyright: string
  trust_badge_1: string
  trust_badge_2: string
  trust_badge_3: string
}

const DEFAULTS: HomeContent = {
  hero_heading: 'Invest Your Spare Change',
  hero_subheading: 'Kamioi automatically rounds up your everyday purchases and invests the difference into diversified portfolios. Build wealth effortlessly with AI-powered micro-investing.',
  hero_cta_text: 'Start Investing Free',
  hero_cta_link: '/register',
  feature_1: 'Automatic Round-Ups',
  feature_1_desc: 'Every purchase is rounded up to the nearest dollar. The spare change is automatically invested.',
  feature_2: 'AI-Powered Insights',
  feature_2_desc: 'Our AI analyzes your spending patterns and optimizes your investment strategy in real-time.',
  feature_3: 'Goal-Based Investing',
  feature_3_desc: 'Set savings goals and track your progress. Our AI adjusts your strategy to help you reach them faster.',
  features_heading: 'Smart investing made simple',
  step_1_title: 'Create Your Account',
  step_1_desc: 'Sign up in seconds with just your email. No paperwork needed.',
  step_2_title: 'Connect Your Cards',
  step_2_desc: 'Link your debit or credit cards securely. We never store your card details.',
  step_3_title: 'Watch Your Wealth Grow',
  step_3_desc: 'Every purchase rounds up automatically. Watch your portfolio grow daily.',
  steps_heading: 'Start in under 2 minutes',
  stat_1_value: '$2.4M+',
  stat_1_label: 'Invested by users',
  stat_2_value: '12,000+',
  stat_2_label: 'Active investors',
  stat_3_value: '99.9%',
  stat_3_label: 'Uptime',
  stat_4_value: '4.8/5',
  stat_4_label: 'App Store rating',
  cta_heading: 'Ready to start building wealth?',
  cta_subtext: 'Join thousands of investors who are growing their portfolios with spare change.',
  cta_button_text: 'Create Free Account',
  app_store_url: '',
  play_store_url: '',
  app_section_heading: 'Get the Kamioi App',
  app_section_subtext: 'Invest on the go. Download Kamioi for iOS and Android.',
  footer_company: 'Kamioi',
  footer_tagline: 'AI-powered micro-investing. Round up your purchases and watch your wealth grow.',
  footer_copyright: 'Kamioi. All rights reserved.',
  trust_badge_1: 'No minimum investment',
  trust_badge_2: 'FDIC insured',
  trust_badge_3: 'Cancel anytime',
}

let cachedContent: HomeContent | null = null

export function useHomeContent(): { content: HomeContent; loading: boolean } {
  const [content, setContent] = useState<HomeContent>(cachedContent ?? DEFAULTS)
  const [loading, setLoading] = useState(!cachedContent)

  useEffect(() => {
    if (cachedContent) return
    supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .eq('setting_type', 'content')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const obj: Record<string, string> = {}
          for (const s of data) {
            if (s.setting_value) obj[s.setting_key] = s.setting_value
          }
          const merged = { ...DEFAULTS }
          for (const key of Object.keys(DEFAULTS) as (keyof HomeContent)[]) {
            if (obj[key]) merged[key] = obj[key]
          }
          cachedContent = merged
          setContent(merged)
        } else {
          cachedContent = DEFAULTS
        }
        setLoading(false)
      })
  }, [])

  return { content, loading }
}

export { DEFAULTS as HOME_DEFAULTS }
