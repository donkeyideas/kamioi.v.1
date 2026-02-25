import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Auth
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const userRecord = await getUserRecord(supabase, user.id)

    // 2. Parse body
    const { receipt_id, edited_data, corrections } = await req.json()
    if (!receipt_id) return errorResponse('receipt_id is required')

    // 3. Fetch receipt & verify ownership
    const { data: receipt, error: receiptErr } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receipt_id)
      .single()

    if (receiptErr || !receipt) return errorResponse('Receipt not found', 404)
    if (receipt.user_id !== userRecord.id) {
      return errorResponse('Receipt does not belong to this user', 403)
    }

    // Ensure receipt has been processed
    if (!receipt.parsed_data || !receipt.allocation_data) {
      return errorResponse('Receipt has not been processed yet. Call receipt-process first.', 400)
    }

    // 4. Apply user edits if provided
    let parsedData = receipt.parsed_data
    let allocationData = receipt.allocation_data

    if (edited_data) {
      parsedData = edited_data.parsed_data ?? parsedData
      allocationData = edited_data.allocation_data ?? allocationData

      await supabase
        .from('receipts')
        .update({
          parsed_data: parsedData,
          allocation_data: allocationData,
          user_corrections: corrections ?? null,
        })
        .eq('id', receipt_id)
    }

    const retailerName = parsedData.retailer?.name || 'Unknown Receipt'
    const totalAmount = parsedData.totalAmount || 0
    const roundUpAmount = allocationData.totalRoundUp || receipt.round_up_amount || 1
    const allocations = allocationData.allocations || []

    // 5. Calculate fee
    let feeRate = 0.025
    const { data: adminSetting } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'platform_fee')
      .maybeSingle()

    if (adminSetting?.setting_value) {
      const parsed = parseFloat(adminSetting.setting_value)
      if (!isNaN(parsed)) feeRate = parsed
    }

    const fee = parseFloat((roundUpAmount * feeRate).toFixed(2))
    const netInvestment = parseFloat((roundUpAmount - fee).toFixed(2))

    // 6. Create transaction record
    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userRecord.id,
        date: new Date().toISOString().split('T')[0],
        merchant: retailerName,
        amount: totalAmount,
        category: 'receipt',
        description: `Receipt: ${receipt.filename}`,
        investable: true,
        round_up: roundUpAmount,
        total_debit: parseFloat((totalAmount + roundUpAmount).toFixed(2)),
        fee,
        status: 'pending',
        transaction_type: 'receipt',
        receipt_id: receipt_id,
      })
      .select('id')
      .single()

    if (txnErr || !txn) {
      return errorResponse(
        `Failed to create transaction: ${txnErr?.message ?? 'unknown'}`,
        500,
      )
    }

    // 7. Create roundup_ledger entry
    const { error: ledgerErr } = await supabase
      .from('roundup_ledger')
      .insert({
        user_id: userRecord.id,
        transaction_id: txn.id,
        round_up_amount: roundUpAmount,
        fee_amount: fee,
        status: 'pending',
      })

    if (ledgerErr) {
      console.error('Ledger insert error:', ledgerErr.message)
    }

    // 8. Create market_queue entries for each allocation
    for (const alloc of allocations) {
      await supabase.from('market_queue').insert({
        user_id: userRecord.id,
        transaction_id: txn.id,
        ticker: alloc.stockSymbol,
        amount: alloc.amount,
        status: 'queued',
      })
    }

    // 9. Create receipt_allocations entries
    for (const alloc of allocations) {
      await supabase.from('receipt_allocations').insert({
        receipt_id: receipt_id,
        transaction_id: txn.id,
        stock_symbol: alloc.stockSymbol,
        stock_name: alloc.stockName,
        allocation_amount: alloc.amount,
        allocation_percentage: alloc.percentage,
        confidence: alloc.confidence,
        reason: alloc.reason,
      })
    }

    // 10. Submit to LLM learning — create llm_mappings for retailer + brands
    const retailerSymbol = parsedData.retailer?.stockSymbol
    if (retailerSymbol) {
      const { data: existing } = await supabase
        .from('llm_mappings')
        .select('id')
        .ilike('merchant_name', retailerName)
        .eq('ticker', retailerSymbol)
        .limit(1)
        .maybeSingle()

      if (!existing) {
        await supabase.from('llm_mappings').insert({
          merchant_name: retailerName,
          ticker: retailerSymbol,
          company_name: retailerName,
          category: 'Retailer',
          confidence: 0.9,
          status: 'approved',
          ai_processed: true,
          admin_approved: true,
          user_id: userRecord.id,
        })
      }
    }

    // Brand mappings
    for (const item of parsedData.items || []) {
      if (item.brand && item.brandSymbol && item.brandConfidence > 0.7) {
        const { data: existing } = await supabase
          .from('llm_mappings')
          .select('id')
          .ilike('merchant_name', item.brand)
          .eq('ticker', item.brandSymbol)
          .limit(1)
          .maybeSingle()

        if (!existing) {
          await supabase.from('llm_mappings').insert({
            merchant_name: item.brand,
            ticker: item.brandSymbol,
            company_name: item.brand,
            category: 'Brand',
            confidence: item.brandConfidence,
            status: item.brandConfidence >= 0.9 ? 'approved' : 'pending',
            ai_processed: true,
            admin_approved: item.brandConfidence >= 0.9,
            user_id: userRecord.id,
          })
        }
      }
    }

    // 11. Update receipt status to completed
    await supabase
      .from('receipts')
      .update({ status: 'completed' })
      .eq('id', receipt_id)

    // 12. Create notification
    const stockList = allocations.map((a: { stockSymbol: string }) => a.stockSymbol).join(', ')
    await supabase.from('notifications').insert({
      user_id: userRecord.id,
      title: 'Receipt Processed',
      message: `Your receipt from ${retailerName} ($${totalAmount.toFixed(2)}) has been processed. $${roundUpAmount.toFixed(2)} round-up allocated across ${stockList}.`,
      type: 'receipt',
      read: false,
    })

    // 13. Return result
    return jsonResponse({
      transaction_id: txn.id,
      receipt_id,
      merchant: retailerName,
      amount: totalAmount,
      round_up: roundUpAmount,
      fee,
      net_investment: netInvestment,
      allocations,
      status: 'completed',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
