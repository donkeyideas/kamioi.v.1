import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface PricingPlan {
  id: number
  name: string
  account_type: string
  tier: string
  price_monthly: number
  price_yearly: number
  features: Record<string, unknown> | null
  display_features: string[] | null
  is_featured: boolean
  is_active: boolean
}

const FALLBACK_PLANS: PricingPlan[] = [
  {
    id: 0,
    name: 'Individual',
    account_type: 'individual',
    tier: 'basic',
    price_monthly: 9.99,
    price_yearly: 99.99,
    features: null,
    display_features: [
      'Automatic round-ups',
      'Basic portfolio',
      'AI insights',
      'Mobile app',
      '1 linked card',
    ],
    is_featured: false,
    is_active: true,
  },
  {
    id: 0,
    name: 'Family',
    account_type: 'family',
    tier: 'family',
    price_monthly: 19.99,
    price_yearly: 199.99,
    features: null,
    display_features: [
      'Everything in Individual',
      'Up to 5 family members',
      'Shared goals',
      'Family dashboard',
      'Priority support',
      '5 linked cards',
    ],
    is_featured: true,
    is_active: true,
  },
  {
    id: 0,
    name: 'Business',
    account_type: 'business',
    tier: 'business',
    price_monthly: 49.99,
    price_yearly: 499.99,
    features: null,
    display_features: [
      'Everything in Family',
      'Unlimited employees',
      'Admin dashboard',
      'Compliance reporting',
      'API access',
      'Dedicated support',
      'Unlimited linked cards',
    ],
    is_featured: false,
    is_active: true,
  },
]

let cachedPlans: PricingPlan[] | null = null

export function usePricingPlans(): { plans: PricingPlan[]; loading: boolean } {
  const [plans, setPlans] = useState<PricingPlan[]>(cachedPlans ?? FALLBACK_PLANS)
  const [loading, setLoading] = useState(!cachedPlans)

  useEffect(() => {
    if (cachedPlans) return
    supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Merge fallback display_features/is_featured when DB columns are missing
          cachedPlans = (data as PricingPlan[]).map((plan) => {
            const fallback = FALLBACK_PLANS.find(
              (f) => f.account_type === plan.account_type,
            )
            return {
              ...plan,
              display_features:
                plan.display_features ?? fallback?.display_features ?? null,
              is_featured: plan.is_featured ?? fallback?.is_featured ?? false,
            }
          })
          setPlans(cachedPlans)
        } else {
          cachedPlans = FALLBACK_PLANS
        }
        setLoading(false)
      })
  }, [])

  return { plans, loading }
}

export function planAccent(accountType: string): 'purple' | 'blue' | 'teal' {
  switch (accountType) {
    case 'family':
      return 'blue'
    case 'business':
      return 'teal'
    default:
      return 'purple'
  }
}
