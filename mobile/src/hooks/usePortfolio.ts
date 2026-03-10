import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getMultipleStockPrices } from '@/services/stockPrices'
import type { Database } from '@/types/database'

type Portfolio = Database['public']['Tables']['portfolios']['Row']

export interface EnrichedHolding extends Portfolio {
  livePrice?: number
  liveChange?: number
  liveChangePercent?: number
  liveValue?: number
  companyName?: string
  domain?: string
}

// Map common tickers to domains for CompanyLogo
const tickerDomainMap: Record<string, string> = {
  AAPL: 'apple.com', AMZN: 'amazon.com', MSFT: 'microsoft.com', GOOGL: 'google.com',
  META: 'meta.com', NFLX: 'netflix.com', TSLA: 'tesla.com', SBUX: 'starbucks.com',
  MCD: 'mcdonalds.com', NKE: 'nike.com', DIS: 'disney.com', WMT: 'walmart.com',
  TGT: 'target.com', COST: 'costco.com', HD: 'homedepot.com', LOW: 'lowes.com',
  SHEL: 'shell.com', XOM: 'exxonmobil.com', JPM: 'jpmorganchase.com', BAC: 'bankofamerica.com',
  V: 'visa.com', MA: 'mastercard.com', PYPL: 'paypal.com', SQ: 'squareup.com',
  UBER: 'uber.com', LYFT: 'lyft.com', ABNB: 'airbnb.com', BA: 'boeing.com',
}

export function usePortfolio(userId: number | undefined) {
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .order('total_value', { ascending: false })

      if (error) throw error
      const holdings = (data || []) as Portfolio[]

      // Enrich with live prices
      const tickers = holdings.map(h => h.ticker)
      const prices = await getMultipleStockPrices(tickers)

      return holdings.map(h => {
        const quote = prices.get(h.ticker)
        return {
          ...h,
          livePrice: quote?.price ?? h.current_price,
          liveChange: quote?.change ?? 0,
          liveChangePercent: quote?.changePercent ?? 0,
          liveValue: (quote?.price ?? h.current_price) * h.shares,
          companyName: quote?.companyName,
          domain: tickerDomainMap[h.ticker],
        } as EnrichedHolding
      })
    },
    enabled: !!userId,
  })
}
