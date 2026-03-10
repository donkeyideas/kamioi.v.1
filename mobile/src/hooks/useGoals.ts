import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Goal = Database['public']['Tables']['goals']['Row']

export function useGoals(userId: number | undefined) {
  return useQuery({
    queryKey: ['goals', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as Goal[]
    },
    enabled: !!userId,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (goal: { user_id: number; title: string; target_amount: number; goal_type: string }) => {
      const { data, error } = await supabase.from('goals').insert({
        ...goal,
        current_amount: 0,
        progress: 0,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })
}
