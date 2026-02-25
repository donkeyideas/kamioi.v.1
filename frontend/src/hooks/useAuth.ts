import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { createElement } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface UserProfile {
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

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<unknown>
  signUp: (email: string, password: string, name: string, accountType?: string) => Promise<unknown>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    isAdmin: false,
  })

  // Prevent duplicate profile fetches
  const profileLoadedRef = useRef(false)

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
    let mounted = true

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session?.user && !profileLoadedRef.current) {
        profileLoadedRef.current = true
        const profile = await fetchProfile(session.user.id)
        if (!mounted) return
        setState({
          user: session.user,
          session,
          profile,
          loading: false,
          isAdmin: profile?.account_type === 'admin',
        })
      } else if (!session) {
        setState(prev => ({ ...prev, loading: false }))
      }
    })

    // IMPORTANT: This callback must NOT be async — Supabase JS v2.97+ awaits
    // async callbacks before signInWithPassword/signOut resolve, which would
    // block the login flow if we do async work (like fetching profile) here.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        // Token refresh — just update session, don't re-fetch profile
        if (event === 'TOKEN_REFRESHED') {
          setState(prev => prev.user ? { ...prev, session } : prev)
          return
        }

        // Sign out
        if (event === 'SIGNED_OUT' || !session) {
          profileLoadedRef.current = false
          setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            isAdmin: false,
          })
          return
        }

        // Sign in / initial session — set user immediately, fetch profile in background
        if (session?.user && !profileLoadedRef.current) {
          profileLoadedRef.current = true
          // Set user/session immediately so ProtectedRoute unblocks
          setState(prev => ({
            ...prev,
            user: session.user,
            session,
            loading: false,
          }))
          // Non-blocking profile fetch
          fetchProfile(session.user.id).then(profile => {
            if (!mounted) return
            setState(prev => ({
              ...prev,
              profile,
              isAdmin: profile?.account_type === 'admin',
            }))
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    profileLoadedRef.current = false
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

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
