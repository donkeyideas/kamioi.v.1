import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Module-level cache shared across all usePageContent consumers.
 * One fetch loads ALL content keys; individual pages pick what they need.
 */
let cachedAll: Record<string, string> | null = null
let fetchPromise: Promise<void> | null = null

function ensureFetched(onDone: () => void) {
  if (cachedAll) {
    onDone()
    return
  }
  if (!fetchPromise) {
    fetchPromise = supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .eq('setting_type', 'content')
      .limit(500)
      .then(({ data }) => {
        cachedAll = {}
        if (data) {
          for (const row of data) {
            if (row.setting_value) cachedAll[row.setting_key] = row.setting_value
          }
        }
      })
  }
  fetchPromise.then(onDone)
}

/**
 * Generic hook for admin-managed page content.
 * Pass a defaults object — keys determine which settings are read.
 * Returns merged content (DB values override defaults).
 */
export function usePageContent<T extends Record<string, string>>(
  defaults: T,
): { content: T; loading: boolean } {
  const [content, setContent] = useState<T>(defaults)
  const [loading, setLoading] = useState(!cachedAll)

  useEffect(() => {
    ensureFetched(() => {
      if (!cachedAll) {
        setLoading(false)
        return
      }
      const merged = { ...defaults }
      for (const key of Object.keys(defaults) as (keyof T)[]) {
        const dbVal = cachedAll[key as string]
        if (dbVal) (merged as Record<string, string>)[key as string] = dbVal
      }
      setContent(merged)
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { content, loading }
}
