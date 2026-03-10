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
  demo_section_heading: string
  demo_section_subtext: string
  hero_video_url: string
}

const DEFAULTS: HomeContent = {
  hero_heading: 'Transform Spending into Ownership',
  hero_subheading: 'Kamioi adds your chosen round-up amount to every purchase and invests it into real stocks. Turn every swipe into a step toward building wealth.',
  hero_cta_text: 'Start Investing Free',
  hero_cta_link: '/register',
  feature_1: 'Automatic Round-Ups',
  feature_1_desc: 'Choose a whole-dollar round-up amount — $1, $2, $3, or more. Every purchase automatically invests that amount into your portfolio.',
  feature_2: 'Smart Stock Matching',
  feature_2_desc: 'Your purchases are automatically matched to relevant stocks. Buy coffee, own coffee company shares — your spending drives your portfolio.',
  feature_3: 'Goal-Based Investing',
  feature_3_desc: 'Set savings goals and track your progress. Your strategy adjusts automatically to help you reach them faster.',
  features_heading: 'How your spending builds wealth',
  step_1_title: 'Create Your Account',
  step_1_desc: 'Sign up in seconds with just your email. Choose Individual, Family, or Business.',
  step_2_title: 'Connect Your Cards',
  step_2_desc: 'Link your debit or credit cards securely. We use bank-level encryption to protect your data.',
  step_3_title: 'Watch Your Wealth Grow',
  step_3_desc: 'Every purchase adds your chosen round-up amount. It\u2019s automatically invested into real stocks.',
  steps_heading: 'Start in under 2 minutes',
  stat_1_value: '$0',
  stat_1_label: 'Minimum to start',
  stat_2_value: '3',
  stat_2_label: 'Account types',
  stat_3_value: '24/7',
  stat_3_label: 'Portfolio access',
  stat_4_value: 'Auto',
  stat_4_label: 'Stock matching',
  cta_heading: 'Ready to start building wealth?',
  cta_subtext: 'Start investing with every purchase today. No minimum balance, no hidden fees.',
  cta_button_text: 'Create Free Account',
  app_store_url: '#',
  play_store_url: '#',
  app_section_heading: 'Get the Kamioi App',
  app_section_subtext: 'Invest on the go. Download Kamioi for iOS and Android — coming soon.',
  footer_company: 'Kamioi',
  footer_tagline: 'Micro-investing that transforms your everyday spending into stock ownership.',
  footer_copyright: 'Kamioi. All rights reserved.',
  trust_badge_1: 'No minimum investment',
  trust_badge_2: 'Bank-level encryption',
  trust_badge_3: 'Cancel anytime',
  demo_section_heading: 'Request a Demo',
  demo_section_subtext: 'See Kamioi in action. Fill out the form below and our team will set you up with demo access.',
  hero_video_url: '',
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
