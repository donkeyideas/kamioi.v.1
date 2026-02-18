import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface UserProfile {
  id: number
  email: string
  name: string
  account_type: 'individual' | 'family' | 'business' | 'admin'
  round_up_amount: number
  subscription_tier: string | null
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    isAdmin: false,
  })

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, account_type, round_up_amount, subscription_tier')
      .eq('auth_id', userId)
      .single()

    if (error || !data) return null
    return data as UserProfile
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({
          user: session.user,
          session,
          profile,
          loading: false,
          isAdmin: profile?.account_type === 'admin',
        })
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setState({
            user: session.user,
            session,
            profile,
            loading: false,
            isAdmin: profile?.account_type === 'admin',
          })
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            isAdmin: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, accountType: string = 'individual') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, account_type: accountType },
      },
    })
    if (error) throw error

    if (data.user) {
      await supabase.from('users').insert({
        auth_id: data.user.id,
        email,
        name,
        account_type: accountType as UserProfile['account_type'],
      })
    }

    return data
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return {
    ...state,
    signIn,
    signUp,
    signOut,
  }
}
