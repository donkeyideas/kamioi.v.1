import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useSeoData<T>(action: string, autoFetch = true) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (extra?: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error: err } = await supabase.functions.invoke('seo-analytics', {
        body: { action, ...extra },
      })
      if (err) setError(err.message ?? String(err))
      else setData(result as T)
    } catch {
      setError('Failed to fetch SEO data')
    }
    setLoading(false)
  }, [action])

  useEffect(() => {
    if (autoFetch) fetch()
  }, [autoFetch, fetch])

  return { data, loading, error, refetch: fetch }
}
