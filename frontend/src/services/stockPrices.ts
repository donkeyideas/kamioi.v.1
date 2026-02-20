/**
 * Stock Price Service
 *
 * Currently disabled — browser-side Yahoo Finance requests are blocked
 * by CORS and all public CORS proxies are unreliable.
 *
 * In production, prices will come from the stock-prices Edge Function
 * deployed to Supabase. Enable by setting STOCK_PRICES_ENABLED = true
 * and implementing the Edge Function fetch path.
 */

export interface StockQuote {
  ticker: string
  price: number        // latest market price
  change: number       // day change ($)
  changePercent: number // day change (%)
  high: number         // day high
  low: number          // day low
  prevClose: number    // previous close
  timestamp: number    // Unix timestamp
}

/**
 * Fetch quotes for multiple tickers.
 * Returns a Map of ticker → StockQuote (only successful fetches).
 *
 * Currently returns empty — will be powered by Edge Function once deployed.
 */
export async function fetchStockPrices(
  tickers: string[],
): Promise<Map<string, StockQuote>> {
  void tickers
  return new Map<string, StockQuote>()
}
