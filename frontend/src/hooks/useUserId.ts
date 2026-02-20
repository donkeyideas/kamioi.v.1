import { useState, useEffect } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * Resolves the current user's ID.
 *
 * 1. Tries `profile.id` from Supabase Auth session.
 * 2. Falls back to querying the first user in the DB (demo/dev mode).
 *
 * Every dashboard tab should use this instead of raw `profile?.id`
 * to ensure data loads even without a real auth session.
 */
export function useUserId() {
  const { profile } = useAuth()
  const [userId, setUserId] = useState<number | undefined>(profile?.id)
  const [loading, setLoading] = useState(!profile?.id)

  useEffect(() => {
    if (profile?.id) {
      setUserId(profile.id)
      setLoading(false)
      return
    }

    let cancelled = false

    async function resolve() {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1)
        .single()

      if (!cancelled) {
        setUserId(data?.id ?? undefined)
        setLoading(false)
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [profile?.id])

  return { userId, loading }
}
