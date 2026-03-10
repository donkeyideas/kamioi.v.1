interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  companyName?: string
}

// Simple cache to avoid repeated API calls
const priceCache = new Map<string, { data: StockQuote; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getStockPrice(symbol: string): Promise<StockQuote | null> {
  const cached = priceCache.get(symbol)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    // Use Supabase edge function for stock prices if available
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.functions.invoke('stock-prices', {
      body: { symbols: [symbol] },
    })

    if (!error && data?.prices?.[0]) {
      const quote: StockQuote = {
        symbol: data.prices[0].symbol,
        price: data.prices[0].price,
        change: data.prices[0].change || 0,
        changePercent: data.prices[0].changePercent || 0,
        companyName: data.prices[0].companyName,
      }
      priceCache.set(symbol, { data: quote, timestamp: Date.now() })
      return quote
    }
  } catch {
    // Fallback: return null
  }

  return null
}

export async function getMultipleStockPrices(symbols: string[]): Promise<Map<string, StockQuote>> {
  const result = new Map<string, StockQuote>()

  // Check cache first
  const uncached: string[] = []
  for (const sym of symbols) {
    const cached = priceCache.get(sym)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      result.set(sym, cached.data)
    } else {
      uncached.push(sym)
    }
  }

  if (uncached.length > 0) {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data, error } = await supabase.functions.invoke('stock-prices', {
        body: { symbols: uncached },
      })

      if (!error && data?.prices) {
        for (const p of data.prices) {
          const quote: StockQuote = {
            symbol: p.symbol,
            price: p.price,
            change: p.change || 0,
            changePercent: p.changePercent || 0,
            companyName: p.companyName,
          }
          priceCache.set(p.symbol, { data: quote, timestamp: Date.now() })
          result.set(p.symbol, quote)
        }
      }
    } catch {
      // Silently fail — return what we have from cache
    }
  }

  return result
}
