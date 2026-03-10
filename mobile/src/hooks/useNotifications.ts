import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications(userId: number | undefined) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data || []) as Notification[]
    },
    enabled: !!userId,
  })
}

export function useUnreadCount(userId: number | undefined) {
  const { data } = useNotifications(userId)
  return data?.filter(n => !n.read).length ?? 0
}
