import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

/* ------------------------------------------------------------------ */
/*  Merchant list for random generation                                */
/* ------------------------------------------------------------------ */

const MERCHANTS = [
  { name: 'Starbucks', category: 'Food & Drink' },
  { name: 'Amazon', category: 'Shopping' },
  { name: 'Uber', category: 'Transportation' },
  { name: 'Walmart', category: 'Shopping' },
  { name: 'Netflix', category: 'Entertainment' },
  { name: 'Spotify', category: 'Entertainment' },
  { name: 'Target', category: 'Shopping' },
  { name: 'Chipotle', category: 'Food & Drink' },
  { name: 'Shell Gas', category: 'Gas' },
  { name: 'Costco', category: 'Shopping' },
  { name: 'Trader Joes', category: 'Groceries' },
  { name: 'CVS Pharmacy', category: 'Health' },
  { name: 'Home Depot', category: 'Home' },
  { name: 'Lyft', category: 'Transportation' },
  { name: 'Whole Foods', category: 'Groceries' },
  { name: 'Chick-fil-A', category: 'Food & Drink' },
  { name: 'Best Buy', category: 'Electronics' },
  { name: 'McDonalds', category: 'Food & Drink' },
  { name: 'Apple', category: 'Electronics' },
  { name: 'DoorDash', category: 'Food & Drink' },
  { name: 'Walgreens', category: 'Health' },
  { name: 'Nike', category: 'Shopping' },
  { name: 'Chevron', category: 'Gas' },
  { name: 'Kroger', category: 'Groceries' },
  { name: 'Panera Bread', category: 'Food & Drink' },
]

/* ------------------------------------------------------------------ */
/*  LLM matching (same logic as teller-sync-transactions)              */
/* ------------------------------------------------------------------ */

async function runLlmMatching(
  supabase: ReturnType<typeof createServiceClient>,
  transactionIds: number[],
  userId: number,
): Promise<{ matched: number; failed: number }> {
  if (transactionIds.length === 0) return { matched: 0, failed: 0 }

  const { data: txns } = await supabase
    .from('transactions')
    .select('id, merchant, amount, round_up, user_id')
    .in('id', transactionIds)

  if (!txns || txns.length === 0) return { matched: 0, failed: 0 }

  const merchantNames = [...new Set(txns.map((t: { merchant: string }) => t.merchant).filter(Boolean))]

  const toTitleCase = (s: string) =>
    s.toLowerCase().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const allVariants = [...new Set(merchantNames.flatMap((name: string) => [name, name.toLowerCase(), toTitleCase(name)]))]

  const { data: mappings } = await supabase
    .from('llm_mappings')
    .select('merchant_name, ticker, confidence, company_name')
    .in('merchant_name', allVariants)
    .eq('status', 'approved')

  const mappingLookup = new Map<string, { ticker: string; confidence: number; company_name: string | null }>()
  for (const m of (mappings || [])) {
    if (!m.ticker) continue
    const key = m.merchant_name.toLowerCase()
    const existing = mappingLookup.get(key)
    if (!existing || (m.confidence ?? 0) > existing.confidence) {
      mappingLookup.set(key, {
        ticker: m.ticker,
        confidence: Number(m.confidence) || 0,
        company_name: m.company_name,
      })
    }
  }

  const matchedTxs: { id: number; ticker: string; roundUp: number; merchant: string }[] = []
  const unmatchedIds: number[] = []

  for (const tx of txns) {
    const mapping = tx.merchant ? mappingLookup.get(tx.merchant.toLowerCase()) : null
    if (mapping) {
      matchedTxs.push({ id: tx.id, ticker: mapping.ticker, roundUp: tx.round_up, merchant: tx.merchant! })
    } else {
      unmatchedIds.push(tx.id)
    }
  }

  const updates = matchedTxs.map((u) =>
    supabase.from('transactions').update({ ticker: u.ticker, status: 'mapped' }).eq('id', u.id),
  )
  if (unmatchedIds.length > 0) {
    updates.push(supabase.from('transactions').update({ status: 'failed' }).in('id', unmatchedIds))
  }
  await Promise.all(updates)

  // Create/update portfolio entries
  const tickerAllocations = new Map<string, number>()
  for (const tx of matchedTxs) {
    tickerAllocations.set(tx.ticker, (tickerAllocations.get(tx.ticker) ?? 0) + tx.roundUp)
  }

  for (const [ticker, totalRoundUp] of tickerAllocations) {
    const { data: existing } = await supabase
      .from('portfolios')
      .select('id, total_value')
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .maybeSingle()

    if (existing) {
      await supabase.from('portfolios')
        .update({ total_value: existing.total_value + totalRoundUp })
        .eq('id', existing.id)
    } else {
      await supabase.from('portfolios').insert({
        user_id: userId, ticker, shares: 0, average_price: 0, current_price: 0, total_value: totalRoundUp,
      })
    }
  }

  // Notification
  const matched = matchedTxs.length
  const failed = unmatchedIds.length
  const totalRoundUps = matchedTxs.reduce((sum, tx) => sum + tx.roundUp, 0)

  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Bank Sync Complete',
    message: `${matched + failed} transactions synced. ${matched} mapped to investments ($${totalRoundUps.toFixed(2)} in round-ups), ${failed} unmatched.`,
    type: matched > 0 ? 'success' : 'info',
  })

  return { matched, failed }
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const userRecord = await getUserRecord(supabase, user.id)

    const userId = userRecord.id
    const roundUpAmount = Number(userRecord.round_up_amount) || 1

    // Generate 8-18 random demo transactions
    const now = new Date()
    const count = Math.floor(Math.random() * 11) + 8
    const transactions = Array.from({ length: count }, () => {
      const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)]
      const amount = parseFloat((Math.random() * 149 + 1).toFixed(2))
      return {
        user_id: userId,
        date: new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000)
          .toISOString().split('T')[0],
        merchant: merchant.name,
        amount,
        category: merchant.category,
        description: `Purchase at ${merchant.name}`,
        investable: true,
        round_up: roundUpAmount,
        total_debit: parseFloat((amount + roundUpAmount).toFixed(2)),
        status: 'pending',
        transaction_type: 'debit',
      }
    })

    const { data: inserted, error: insertErr } = await supabase
      .from('transactions')
      .insert(transactions)
      .select('id')

    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`)

    const insertedIds = (inserted || []).map((r: { id: number }) => r.id)

    // Run LLM matching
    const result = await runLlmMatching(supabase, insertedIds, userId)

    return jsonResponse({
      synced: count,
      mapped: result.matched,
      failed: result.failed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
