import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Authenticate user
    const { user } = await getAuthUser(req)
    const serviceClient = createServiceClient()

    // 2. Get user record to retrieve round_up_amount setting
    const userRecord = await getUserRecord(serviceClient, user.id)
    const defaultRoundUp: number = userRecord.round_up_amount ?? 1

    // Parse request body
    const body = await req.json()
    const { transaction_id, amount, merchant, category } = body

    if (!transaction_id && (amount === undefined || !merchant)) {
      return errorResponse(
        'Provide either transaction_id or both amount and merchant',
      )
    }

    let txnId: number = transaction_id
    let txnAmount: number
    let txnMerchant: string
    let txnCategory: string | null

    if (transaction_id) {
      // 3. Fetch existing transaction and verify ownership
      const { data: txn, error: txnError } = await serviceClient
        .from('transactions')
        .select('*')
        .eq('id', transaction_id)
        .single()

      if (txnError || !txn) {
        return errorResponse('Transaction not found', 404)
      }

      if (txn.user_id !== userRecord.id) {
        return errorResponse('Transaction does not belong to this user', 403)
      }

      txnAmount = txn.amount
      txnMerchant = txn.merchant
      txnCategory = txn.category ?? null
    } else {
      // Validate the provided amount
      if (typeof amount !== 'number' || amount <= 0) {
        return errorResponse('Amount must be a positive number')
      }

      txnAmount = amount
      txnMerchant = merchant
      txnCategory = category ?? null
    }

    // 4. Calculate round-up
    const ceilAmount = Math.ceil(txnAmount)
    const rawRoundUp = ceilAmount - txnAmount
    // If the amount is already a whole number (rawRoundUp is 0), use the
    // user's configured round_up_amount (default $1).
    const roundUp =
      rawRoundUp === 0
        ? defaultRoundUp
        : parseFloat(rawRoundUp.toFixed(2))

    // 5. Calculate fee
    // Try to read platform_fee from admin_settings; fall back to 0.025 (2.5%)
    let feeRate = 0.025
    const { data: adminSetting } = await serviceClient
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'platform_fee')
      .maybeSingle()

    if (adminSetting?.setting_value !== undefined && adminSetting.setting_value !== null) {
      const parsed = parseFloat(adminSetting.setting_value)
      if (!isNaN(parsed)) {
        feeRate = parsed
      }
    }

    const fee = parseFloat((roundUp * feeRate).toFixed(2))
    const netInvestment = parseFloat((roundUp - fee).toFixed(2))

    // 6. If no existing transaction_id, create a new transaction record
    if (!transaction_id) {
      const { data: newTxn, error: insertTxnError } = await serviceClient
        .from('transactions')
        .insert({
          user_id: userRecord.id,
          merchant: txnMerchant,
          category: txnCategory,
          amount: txnAmount,
          round_up: roundUp,
          fee,
          status: 'pending',
        })
        .select('id')
        .single()

      if (insertTxnError || !newTxn) {
        return errorResponse(
          `Failed to create transaction: ${insertTxnError?.message ?? 'unknown error'}`,
          500,
        )
      }

      txnId = newTxn.id
    }

    // 7. Insert into roundup_ledger
    const { data: ledger, error: ledgerError } = await serviceClient
      .from('roundup_ledger')
      .insert({
        user_id: userRecord.id,
        transaction_id: txnId,
        round_up_amount: roundUp,
        fee_amount: fee,
        status: 'pending',
      })
      .select('id')
      .single()

    if (ledgerError || !ledger) {
      return errorResponse(
        `Failed to insert ledger entry: ${ledgerError?.message ?? 'unknown error'}`,
        500,
      )
    }

    // 8. Insert into market_queue
    const { data: queue, error: queueError } = await serviceClient
      .from('market_queue')
      .insert({
        user_id: userRecord.id,
        transaction_id: txnId,
        ticker: null,
        amount: netInvestment,
        status: 'queued',
      })
      .select('id')
      .single()

    if (queueError || !queue) {
      return errorResponse(
        `Failed to insert market queue entry: ${queueError?.message ?? 'unknown error'}`,
        500,
      )
    }

    // 9. Return result
    return jsonResponse({
      transaction_id: txnId,
      round_up: roundUp,
      fee,
      net_investment: netInvestment,
      ledger_id: ledger.id,
      queue_id: queue.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
