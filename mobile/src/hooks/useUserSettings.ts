import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type UserSetting = Database['public']['Tables']['user_settings']['Row']

export function useUserSettings(userId: number | undefined) {
  return useQuery({
    queryKey: ['user_settings', userId],
    queryFn: async () => {
      if (!userId) return {}
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      const map: Record<string, string> = {}
      for (const s of (data || []) as UserSetting[]) {
        map[s.setting_key] = s.setting_value
      }
      return map
    },
    enabled: !!userId,
  })
}

export function useUpdateSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, key, value }: { userId: number; key: string; value: string }) => {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, setting_key: key, setting_value: value }, { onConflict: 'user_id,setting_key' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_settings'] })
    },
  })
}
