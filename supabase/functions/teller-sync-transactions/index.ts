import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { tellerGet } from '../_shared/teller.ts'

/* ------------------------------------------------------------------ */
/*  Category mapping                                                   */
/* ------------------------------------------------------------------ */

interface CategoryMap { [key: string]: string }

async function loadCategoryMap(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<CategoryMap> {
  const { data } = await supabase
    .from('category_map')
    .select('source_category, kamioi_category')

  const map: CategoryMap = {}
  for (const row of data || []) {
    map[row.source_category.toLowerCase()] = row.kamioi_category
  }
  return map
}

function mapCategory(tellerCategory: string | null, categoryMap: CategoryMap): string {
  if (!tellerCategory) return 'Shopping'
  const lower = tellerCategory.toLowerCase()
  if (categoryMap[lower]) return categoryMap[lower]

  // Fuzzy: check if any key is contained in the category
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lower.includes(key) || key.includes(lower)) return value
  }
  return 'Shopping'
}

/* ------------------------------------------------------------------ */
/*  Round-up calculation                                               */
/* ------------------------------------------------------------------ */

function calculateRoundUp(amount: number, roundUpAmount: number): number {
  if (amount <= 0) return 0
  const cents = amount % 1
  if (cents === 0) return roundUpAmount
  const roundUp = parseFloat((Math.ceil(amount) - amount).toFixed(2))
  return roundUp < 0.01 ? roundUpAmount : roundUp
}

/* ------------------------------------------------------------------ */
/*  LLM matching (server-side ticker mapping + portfolio)              */
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

  const { data: mappings } = await supabase
    .from('llm_mappings')
    .select('merchant_name, ticker, confidence, company_name')
    .in('merchant_name', merchantNames)
    .eq('status', 'approved')

  const mappingLookup = new Map<string, { ticker: string; confidence: number; company_name: string | null }>()
  for (const m of (mappings || [])) {
    if (!m.ticker) continue
    const existing = mappingLookup.get(m.merchant_name)
    if (!existing || (m.confidence ?? 0) > existing.confidence) {
      mappingLookup.set(m.merchant_name, {
        ticker: m.ticker,
        confidence: Number(m.confidence) || 0,
        company_name: m.company_name,
      })
    }
  }

  const matchedTxs: { id: number; ticker: string; roundUp: number; merchant: string }[] = []
  const unmatchedIds: number[] = []

  for (const tx of txns) {
    const mapping = tx.merchant ? mappingLookup.get(tx.merchant) : null
    if (mapping) {
      matchedTxs.push({ id: tx.id, ticker: mapping.ticker, roundUp: tx.round_up, merchant: tx.merchant! })
    } else {
      unmatchedIds.push(tx.id)
    }
  }

  // Update matched → mapped
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
    message: `${matched + failed} transactions synced from your bank. ${matched} mapped to investments ($${totalRoundUps.toFixed(2)} in round-ups), ${failed} pending AI mapping.`,
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

    // Optional: sync specific enrollment
    let enrollmentId: string | undefined
    try {
      const body = await req.json()
      enrollmentId = body?.enrollment_id
    } catch {
      // No body = sync all
    }

    // Get enrollments to sync
    let query = supabase
      .from('teller_enrollments')
      .select('id, enrollment_id, access_token')
      .eq('user_id', userRecord.id)
      .eq('is_active', true)

    if (enrollmentId) {
      query = query.eq('enrollment_id', enrollmentId)
    }

    const { data: enrollments } = await query.limit(20)

    if (!enrollments || enrollments.length === 0) {
      return errorResponse('No active bank connections found', 404)
    }

    const categoryMap = await loadCategoryMap(supabase)
    const roundUpAmount = Number(userRecord.round_up_amount) || 1

    let totalSynced = 0
    let totalMatched = 0
    let totalFailed = 0

    for (const enrollment of enrollments) {
      // Get accounts for this enrollment
      const { data: accounts } = await supabase
        .from('teller_accounts')
        .select('teller_account_id')
        .eq('enrollment_id', enrollment.id)
        .eq('is_active', true)

      if (!accounts || accounts.length === 0) continue

      for (const account of accounts) {
        // Fetch transactions from Teller API
        let tellerTxns: {
          id: string
          account_id: string
          amount: string
          date: string
          description: string
          details: { category?: string; counterparty?: { name?: string } }
          type: string
          status: string
        }[] = []

        try {
          tellerTxns = await tellerGet(
            `/accounts/${account.teller_account_id}/transactions`,
            enrollment.access_token,
          )
        } catch (err) {
          console.error(`Failed to fetch transactions for account ${account.teller_account_id}:`, err)
          continue
        }

        if (!Array.isArray(tellerTxns) || tellerTxns.length === 0) continue

        // Build insert rows, skip duplicates
        const newTxns: {
          user_id: number
          date: string
          merchant: string
          amount: number
          category: string
          description: string
          investable: boolean
          round_up: number
          total_debit: number
          status: string
          transaction_type: string
          teller_transaction_id: string
          teller_account_id: string
        }[] = []

        for (const tx of tellerTxns) {
          // Teller amounts: negative = debit (money spent), positive = credit
          const amount = Math.abs(parseFloat(tx.amount))
          if (amount <= 0) continue

          // Skip credits (deposits, refunds)
          if (parseFloat(tx.amount) > 0) continue

          // Check for duplicate
          const { data: existing } = await supabase
            .from('transactions')
            .select('id')
            .eq('teller_transaction_id', tx.id)
            .maybeSingle()

          if (existing) continue

          // Merchant name: Teller provides counterparty.name or description
          const merchantName = tx.details?.counterparty?.name || tx.description || 'Unknown'
          const category = mapCategory(tx.details?.category || null, categoryMap)
          const roundUp = calculateRoundUp(amount, roundUpAmount)

          newTxns.push({
            user_id: userRecord.id,
            date: tx.date,
            merchant: merchantName,
            amount,
            category,
            description: tx.description || `Purchase at ${merchantName}`,
            investable: true,
            round_up: roundUp,
            total_debit: parseFloat((amount + roundUp).toFixed(2)),
            status: 'pending',
            transaction_type: 'bank',
            teller_transaction_id: tx.id,
            teller_account_id: tx.account_id,
          })
        }

        // Batch insert
        if (newTxns.length > 0) {
          const { data: inserted, error: insertErr } = await supabase
            .from('transactions')
            .insert(newTxns)
            .select('id')

          if (insertErr) {
            console.error('Transaction insert error:', insertErr.message)
            continue
          }

          const insertedIds = (inserted || []).map((r: { id: number }) => r.id)
          totalSynced += insertedIds.length

          // Run LLM matching
          const result = await runLlmMatching(supabase, insertedIds, userRecord.id)
          totalMatched += result.matched
          totalFailed += result.failed
        }
      }

      // Update last_synced_at
      await supabase
        .from('teller_enrollments')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', enrollment.id)
    }

    return jsonResponse({
      synced: totalSynced,
      mapped: totalMatched,
      failed: totalFailed,
      enrollments_synced: enrollments.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
