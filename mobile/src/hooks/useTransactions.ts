import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']

interface TransactionFilters {
  status?: string
  ticker?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}

export function useTransactions(userId: number | undefined, filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', userId, filters],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.ticker) query = query.eq('ticker', filters.ticker)
      if (filters?.dateFrom) query = query.gte('date', filters.dateFrom)
      if (filters?.dateTo) query = query.lte('date', filters.dateTo)
      if (filters?.limit) query = query.limit(filters.limit)

      const { data, error } = await query
      if (error) throw error
      return (data || []) as Transaction[]
    },
    enabled: !!userId,
  })
}
