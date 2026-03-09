import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useSeoData<T>(action: string, autoFetch = true) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const fetchData = useCallback(async (extra?: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      // Ensure we have a session before calling
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      const { data: result, error: err } = await supabase.functions.invoke('seo-analytics', {
        body: { action, ...extra },
      })
      if (!mounted.current) return
      if (err) {
        setError(err.message ?? String(err))
      } else {
        setData(result as T)
      }
    } catch {
      if (mounted.current) setError('Failed to fetch SEO data')
    }
    if (mounted.current) setLoading(false)
  }, [action])

  useEffect(() => {
    mounted.current = true
    if (autoFetch) fetchData()
    return () => { mounted.current = false }
  }, [autoFetch, fetchData])

  return { data, loading, error, refetch: fetchData }
}
