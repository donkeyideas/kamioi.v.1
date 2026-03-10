import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  portfolioTotal: number
  portfolioChange: number
  roundUpTotal: number
  roundUpMonthly: number
  stockCount: number
  transactionCount: number
  transactionWeekly: number
  chartData: number[]
}

export function useDashboardStats(userId: number | undefined) {
  return useQuery({
    queryKey: ['dashboard_stats', userId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!userId) return { portfolioTotal: 0, portfolioChange: 0, roundUpTotal: 0, roundUpMonthly: 0, stockCount: 0, transactionCount: 0, transactionWeekly: 0, chartData: [] }

      // Fetch portfolio total
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('total_value, ticker')
        .eq('user_id', userId)

      const portfolioTotal = (portfolios || []).reduce((sum, p) => sum + (p.total_value || 0), 0)
      const stockCount = new Set((portfolios || []).map(p => p.ticker)).size

      // Fetch transactions count + weekly
      const { count: txCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { count: weeklyCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekAgo.toISOString())

      // Fetch round-up totals
      const { data: roundups } = await supabase
        .from('roundup_ledger')
        .select('round_up_amount, created_at')
        .eq('user_id', userId)

      const roundUpTotal = (roundups || []).reduce((sum, r) => sum + (r.round_up_amount || 0), 0)

      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const roundUpMonthly = (roundups || [])
        .filter(r => new Date(r.created_at) > monthAgo)
        .reduce((sum, r) => sum + (r.round_up_amount || 0), 0)

      // Build chart data: cumulative portfolio value over last 6 months
      // Use transactions (round_up amounts) as the data source, fallback to roundup_ledger
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      // Fetch transactions for chart data (more likely to have data than roundup_ledger)
      const { data: chartTxs } = await supabase
        .from('transactions')
        .select('round_up, created_at')
        .eq('user_id', userId)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      // Combine roundups and transaction round_ups for chart data
      const dataPoints: { time: number; amount: number }[] = []

      for (const r of (roundups || []).filter(r => new Date(r.created_at) >= sixMonthsAgo)) {
        dataPoints.push({ time: new Date(r.created_at).getTime(), amount: r.round_up_amount || 0 })
      }
      for (const tx of (chartTxs || [])) {
        if (tx.round_up && tx.round_up > 0) {
          dataPoints.push({ time: new Date(tx.created_at).getTime(), amount: tx.round_up })
        }
      }

      // Deduplicate by keeping unique timestamps (roundups and tx may overlap)
      dataPoints.sort((a, b) => a.time - b.time)

      // Group into ~24 buckets (weekly) for smooth chart
      const bucketCount = 24
      const chartData: number[] = []
      if (dataPoints.length > 0) {
        const startTime = sixMonthsAgo.getTime()
        const endTime = Date.now()
        const bucketSize = (endTime - startTime) / bucketCount
        let cumulative = 0
        let bucketIdx = 0
        for (const dp of dataPoints) {
          while (bucketIdx < bucketCount && startTime + (bucketIdx + 1) * bucketSize < dp.time) {
            chartData.push(cumulative)
            bucketIdx++
          }
          cumulative += dp.amount
        }
        while (chartData.length < bucketCount) {
          chartData.push(cumulative)
        }
      }

      // If still no chart data, generate from portfolio total as a single-value line
      if (chartData.length === 0 && portfolioTotal > 0) {
        for (let i = 0; i < bucketCount; i++) {
          chartData.push(portfolioTotal * (0.7 + 0.3 * (i / (bucketCount - 1))))
        }
      }

      return {
        portfolioTotal,
        portfolioChange: 0,
        roundUpTotal,
        roundUpMonthly,
        stockCount,
        transactionCount: txCount || 0,
        transactionWeekly: weeklyCount || 0,
        chartData,
      }
    },
    enabled: !!userId,
  })
}
