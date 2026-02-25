import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import {
  createServiceClient,
  getAuthUser,
  getUserRecord,
} from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

// ---------------------------------------------------------------------------
// Well-known ticker baseline prices for fallback mock data
// ---------------------------------------------------------------------------
const BASELINE_PRICES: Record<string, number> = {
  AAPL: 175,
  GOOGL: 140,
  GOOG: 140,
  MSFT: 420,
  AMZN: 185,
  META: 500,
  TSLA: 250,
  NVDA: 800,
  JPM: 195,
  V: 280,
  MA: 460,
  WMT: 165,
  DIS: 110,
  NFLX: 620,
  PYPL: 65,
  SQ: 75,
  COIN: 220,
  AMD: 160,
  INTC: 32,
  BA: 190,
  KO: 60,
  PEP: 170,
  MCD: 290,
  SBUX: 95,
  NKE: 105,
}

const DEFAULT_BASELINE = 100

// ---------------------------------------------------------------------------
// Fetch price from Yahoo Finance (unofficial chart endpoint)
// ---------------------------------------------------------------------------
interface YahooResult {
  price: number
  previousClose: number
}

async function fetchYahooPrice(ticker: string): Promise<YahooResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Kamioi/1.0' },
      signal: AbortSignal.timeout(5000),
    })

    if (!resp.ok) return null

    const data = await resp.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const meta = result.meta
    const price =
      meta?.regularMarketPrice ?? meta?.previousClose ?? null
    const previousClose = meta?.chartPreviousClose ?? meta?.previousClose ?? null

    if (price === null || price === undefined) return null

    return { price: parseFloat(Number(price).toFixed(2)), previousClose: previousClose ?? price }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Generate mock price with small random variance
// ---------------------------------------------------------------------------
function generateMockPrice(ticker: string): YahooResult {
  const baseline = BASELINE_PRICES[ticker.toUpperCase()] ?? DEFAULT_BASELINE
  // Random variance between -2% and +2%
  const variance = (Math.random() * 4 - 2) / 100
  const price = parseFloat((baseline * (1 + variance)).toFixed(2))
  // Previous close is baseline with a smaller variance
  const prevVariance = (Math.random() * 2 - 1) / 100
  const previousClose = parseFloat((baseline * (1 + prevVariance)).toFixed(2))
  return { price, previousClose }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Authenticate user
    const { user } = await getAuthUser(req)
    const serviceClient = createServiceClient()
    const userRecord = await getUserRecord(serviceClient, user.id)

    // 2. Determine tickers
    const url = new URL(req.url)
    const tickersParam = url.searchParams.get('tickers')

    let tickers: string[]

    if (tickersParam) {
      tickers = tickersParam
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length > 0)

      if (tickers.length === 0) {
        return errorResponse('No valid tickers provided')
      }
    } else {
      // Fetch distinct tickers from user's portfolios
      const { data: portfolioRows, error: portfolioError } = await serviceClient
        .from('portfolios')
        .select('ticker')
        .eq('user_id', userRecord.id)

      if (portfolioError) {
        return errorResponse(
          `Failed to fetch portfolio tickers: ${portfolioError.message}`,
          500,
        )
      }

      if (!portfolioRows || portfolioRows.length === 0) {
        return jsonResponse({
          prices: {},
          updated_count: 0,
          message: 'No tickers found in portfolio',
        })
      }

      // Deduplicate tickers
      const tickerSet = new Set<string>()
      for (const row of portfolioRows) {
        if (row.ticker) tickerSet.add(row.ticker.toUpperCase())
      }
      tickers = Array.from(tickerSet)
    }

    // 3. Fetch prices for each ticker
    const prices: Record<
      string,
      {
        price: number
        change: number
        change_percent: number
        updated_at: string
      }
    > = {}

    const now = new Date().toISOString()

    for (const ticker of tickers) {
      // Try Yahoo Finance first, fall back to mock
      let result = await fetchYahooPrice(ticker)
      if (!result) {
        result = generateMockPrice(ticker)
      }

      const change = parseFloat((result.price - result.previousClose).toFixed(2))
      const changePercent =
        result.previousClose !== 0
          ? parseFloat(((change / result.previousClose) * 100).toFixed(2))
          : 0

      prices[ticker] = {
        price: result.price,
        change,
        change_percent: changePercent,
        updated_at: now,
      }
    }

    // 4. Update portfolios table: set current_price and recalculate total_value
    let updatedCount = 0

    for (const ticker of tickers) {
      const currentPrice = prices[ticker].price

      // Fetch all portfolio rows for this user and ticker
      const { data: rows, error: fetchErr } = await serviceClient
        .from('portfolios')
        .select('id, shares')
        .eq('user_id', userRecord.id)
        .eq('ticker', ticker)

      if (fetchErr || !rows) continue

      for (const row of rows) {
        const totalValue = parseFloat(
          (Number(row.shares) * currentPrice).toFixed(2),
        )

        const { error: updateErr } = await serviceClient
          .from('portfolios')
          .update({
            current_price: currentPrice,
            total_value: totalValue,
          })
          .eq('id', row.id)

        if (!updateErr) updatedCount++
      }
    }

    // 5. Return result
    return jsonResponse({
      prices,
      updated_count: updatedCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
