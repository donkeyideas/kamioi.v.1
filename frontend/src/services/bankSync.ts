/**
 * Bank Sync Service — generates demo transactions, runs LLM matching,
 * creates portfolio entries, and sends notifications.
 *
 * Shared across User, Family, and Business dashboards.
 */

import { supabaseAdmin } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Merchant list for random generation                                */
/* ------------------------------------------------------------------ */

export const MERCHANTS = [
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
/*  Account ID generator                                               */
/* ------------------------------------------------------------------ */

export function generateAccountId(accountType: string, id: number): string {
  const prefix = accountType === 'family' ? 'F'
    : accountType === 'business' ? 'B'
    : accountType === 'admin' ? 'A'
    : 'I'
  return prefix + String(id).padStart(9, '0')
}

/* ------------------------------------------------------------------ */
/*  Random transaction generator                                       */
/* ------------------------------------------------------------------ */

export function generateRandomTransactions(count: number, userId: number, roundUpAmount: number) {
  const now = new Date()
  return Array.from({ length: count }, () => {
    const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)]
    const amount = parseFloat((Math.random() * 149 + 1).toFixed(2))

    return {
      user_id: userId,
      date: new Date(now.getTime() - Math.floor(Math.random() * 365) * 86400000)
        .toISOString().split('T')[0],
      merchant: merchant.name,
      amount,
      category: merchant.category,
      description: `Purchase at ${merchant.name}`,
      investable: true,
      round_up: roundUpAmount,
      total_debit: parseFloat((amount + roundUpAmount).toFixed(2)),
      status: 'pending' as const,
      transaction_type: 'debit',
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Get or create test user with account_id                            */
/* ------------------------------------------------------------------ */

export async function getOrCreateTestUser(): Promise<{
  id: number
  roundUpAmount: number
  accountId: string
}> {
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id, round_up_amount, account_type, account_id')
    .limit(1)
    .single()

  if (existing) {
    let accountId = existing.account_id as string | null
    if (!accountId) {
      accountId = generateAccountId(existing.account_type ?? 'individual', existing.id)
      await supabaseAdmin.from('users').update({ account_id: accountId }).eq('id', existing.id)
    }
    return { id: existing.id, roundUpAmount: Number(existing.round_up_amount) || 1, accountId }
  }

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert({
      email: 'testuser@kamioi.com',
      name: 'Alex Rivera',
      account_type: 'individual',
      round_up_amount: 1.00,
      subscription_tier: 'basic',
    })
    .select('id, round_up_amount, account_type')
    .single()

  if (error) throw new Error(`Failed to create test user: ${error.message}`)

  const accountId = generateAccountId(created.account_type ?? 'individual', created.id)
  await supabaseAdmin.from('users').update({ account_id: accountId }).eq('id', created.id)

  return { id: created.id, roundUpAmount: Number(created.round_up_amount) || 1, accountId }
}

/* ------------------------------------------------------------------ */
/*  LLM Matching + Portfolio Creation + Notifications                  */
/* ------------------------------------------------------------------ */

export async function processTransactionsLlmMatching(
  transactionIds: number[],
  userId: number,
): Promise<{ matched: number; failed: number }> {
  if (transactionIds.length === 0) return { matched: 0, failed: 0 }

  const { data: txns } = await supabaseAdmin
    .from('transactions')
    .select('id, merchant, amount, round_up, user_id')
    .in('id', transactionIds)

  if (!txns || txns.length === 0) return { matched: 0, failed: 0 }

  const merchantNames = [...new Set(txns.map(t => t.merchant).filter(Boolean))] as string[]

  const { data: mappings } = await supabaseAdmin
    .from('llm_mappings')
    .select('merchant_name, ticker, confidence, company_name')
    .in('merchant_name', merchantNames)
    .eq('status', 'approved')

  const mappingLookup = new Map<string, { ticker: string; confidence: number; company_name: string | null }>()
  for (const m of (mappings ?? [])) {
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

  const matchedTxs: { id: number; ticker: string; roundUp: number; merchant: string; confidence: number; companyName: string | null }[] = []
  const unmatchedIds: number[] = []

  for (const tx of txns) {
    const mapping = tx.merchant ? mappingLookup.get(tx.merchant) : null
    if (mapping) {
      matchedTxs.push({ id: tx.id, ticker: mapping.ticker, roundUp: tx.round_up, merchant: tx.merchant!, confidence: mapping.confidence, companyName: mapping.company_name })
    } else {
      unmatchedIds.push(tx.id)
    }
  }

  // Update matched transactions: ticker + mapped status
  const updatePromises = matchedTxs.map(u =>
    supabaseAdmin.from('transactions')
      .update({ ticker: u.ticker, status: 'mapped' })
      .eq('id', u.id)
  )

  // Mark unmatched as failed
  if (unmatchedIds.length > 0) {
    updatePromises.push(
      supabaseAdmin.from('transactions')
        .update({ status: 'failed' })
        .in('id', unmatchedIds)
    )
  }

  await Promise.all(updatePromises)

  // --- Grow the LLM mapping database: insert a confirmed mapping for each matched transaction ---
  if (matchedTxs.length > 0) {
    const newMappings = matchedTxs.map(tx => ({
      transaction_id: tx.id,
      merchant_name: tx.merchant,
      ticker: tx.ticker,
      company_name: tx.companyName,
      confidence: tx.confidence,
      status: 'approved' as const,
      admin_approved: true,
      ai_processed: true,
      user_id: userId,
    }))
    await supabaseAdmin.from('llm_mappings').insert(newMappings)
  }

  // --- Create/update portfolio entries for mapped transactions ---
  const tickerAllocations = new Map<string, number>()
  for (const tx of matchedTxs) {
    tickerAllocations.set(tx.ticker, (tickerAllocations.get(tx.ticker) ?? 0) + tx.roundUp)
  }

  for (const [ticker, totalRoundUp] of tickerAllocations) {
    const { data: existingPortfolio } = await supabaseAdmin
      .from('portfolios')
      .select('id, total_value')
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .maybeSingle()

    if (existingPortfolio) {
      await supabaseAdmin.from('portfolios')
        .update({ total_value: existingPortfolio.total_value + totalRoundUp })
        .eq('id', existingPortfolio.id)
    } else {
      await supabaseAdmin.from('portfolios')
        .insert({
          user_id: userId,
          ticker,
          shares: 0,
          average_price: 0,
          current_price: 0,
          total_value: totalRoundUp,
        })
    }
  }

  // --- Create notifications ---
  const matched = matchedTxs.length
  const failed = unmatchedIds.length
  const totalRoundUps = matchedTxs.reduce((sum, tx) => sum + tx.roundUp, 0)

  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    title: 'Bank Sync Complete',
    message: `${matched + failed} transactions synced. ${matched} mapped to investments ($${totalRoundUps.toFixed(2)} in round-ups), ${failed} unmatched.`,
    type: matched > 0 ? 'success' : 'info',
  })

  if (matched > 0) {
    const tickers = [...new Set(matchedTxs.map(t => t.ticker))].join(', ')
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Round-Ups Allocated',
      message: `$${totalRoundUps.toFixed(2)} in round-ups allocated across ${tickerAllocations.size} stock${tickerAllocations.size > 1 ? 's' : ''}: ${tickers}. Pending stock purchase.`,
      type: 'info',
    })
  }

  return { matched, failed }
}

/* ------------------------------------------------------------------ */
/*  Reprocess all failed transactions against current mappings         */
/* ------------------------------------------------------------------ */

export async function reprocessFailedTransactions(): Promise<{
  total: number
  matched: number
  failed: number
}> {
  // Get all failed transactions
  const { data: failedTxs } = await supabaseAdmin
    .from('transactions')
    .select('id, user_id')
    .eq('status', 'failed')

  if (!failedTxs || failedTxs.length === 0) return { total: 0, matched: 0, failed: 0 }

  // Group by user_id
  const byUser = new Map<number, number[]>()
  for (const tx of failedTxs) {
    const ids = byUser.get(tx.user_id) ?? []
    ids.push(tx.id)
    byUser.set(tx.user_id, ids)
  }

  // Reset failed → pending so processTransactionsLlmMatching can pick them up
  await supabaseAdmin
    .from('transactions')
    .update({ status: 'pending' })
    .eq('status', 'failed')

  let totalMatched = 0
  let totalFailed = 0
  for (const [userId, txIds] of byUser) {
    const result = await processTransactionsLlmMatching(txIds, userId)
    totalMatched += result.matched
    totalFailed += result.failed
  }

  return { total: failedTxs.length, matched: totalMatched, failed: totalFailed }
}

/* ------------------------------------------------------------------ */
/*  Helper: get-or-create a user by email                              */
/* ------------------------------------------------------------------ */

async function getOrCreateUser(
  email: string,
  name: string,
  accountType: string,
  roundUp: number,
): Promise<number> {
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      name,
      account_type: accountType,
      round_up_amount: roundUp,
      subscription_tier: 'basic',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`)

  const accountId = generateAccountId(accountType, created.id)
  await supabaseAdmin.from('users').update({ account_id: accountId }).eq('id', created.id)

  return created.id
}

/* ------------------------------------------------------------------ */
/*  Ensure family + business records & extra users exist               */
/* ------------------------------------------------------------------ */

async function ensureFamilyAndBusiness(primaryUserId: number): Promise<{
  familyUserIds: number[]
  businessUserIds: number[]
}> {
  // Create family member user
  const familyMemberId = await getOrCreateUser(
    'maria.rivera@kamioi.com', 'Maria Rivera', 'family', 2,
  )

  // Create business member user
  const bizMemberId = await getOrCreateUser(
    'carlos.rivera@kamioi.com', 'Carlos Rivera', 'business', 3,
  )

  // Ensure account_id prefix is correct for the additional users
  const fAccountId = generateAccountId('family', familyMemberId)
  const bAccountId = generateAccountId('business', bizMemberId)
  await Promise.all([
    supabaseAdmin.from('users').update({ account_id: fAccountId }).eq('id', familyMemberId),
    supabaseAdmin.from('users').update({ account_id: bAccountId }).eq('id', bizMemberId),
  ])

  // Family — create if primary user has no family
  const { data: existingFm } = await supabaseAdmin
    .from('family_members')
    .select('family_id')
    .eq('user_id', primaryUserId)
    .maybeSingle()

  let familyId: number | null = existingFm?.family_id ?? null

  if (!familyId) {
    const { data: family } = await supabaseAdmin
      .from('families')
      .insert({ name: 'Rivera Family', created_by: primaryUserId })
      .select('id')
      .single()

    if (family) {
      familyId = family.id
      await supabaseAdmin.from('family_members').insert({
        family_id: family.id,
        user_id: primaryUserId,
        role: 'owner',
        status: 'active',
      })
    }
  }

  // Add family member (skip if already exists)
  if (familyId) {
    await supabaseAdmin.from('family_members')
      .upsert({ family_id: familyId, user_id: familyMemberId, role: 'member', status: 'active' },
        { onConflict: 'family_id,user_id' })
  }

  // Business — create if primary user has no business
  const { data: existingBiz } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('created_by', primaryUserId)
    .maybeSingle()

  let businessId: number | null = existingBiz?.id ?? null

  if (!businessId) {
    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .insert({ name: 'Rivera Ventures', created_by: primaryUserId, industry: 'Technology', size: 'Small' })
      .select('id')
      .single()

    if (biz) {
      businessId = biz.id
      await supabaseAdmin.from('business_members').insert({
        business_id: biz.id,
        user_id: primaryUserId,
        role: 'admin',
        department: 'Engineering',
        status: 'active',
      })
    }
  }

  // Add business member (skip if already exists)
  if (businessId) {
    await supabaseAdmin.from('business_members')
      .upsert({ business_id: businessId, user_id: bizMemberId, role: 'employee', department: 'Marketing', status: 'active' },
        { onConflict: 'business_id,user_id' })
  }

  return {
    familyUserIds: [primaryUserId, familyMemberId],
    businessUserIds: [primaryUserId, bizMemberId],
  }
}

/* ------------------------------------------------------------------ */
/*  Full bank sync flow                                                */
/* ------------------------------------------------------------------ */

export async function runBankSync(): Promise<{
  count: number
  matched: number
  failed: number
}> {
  const { id: userId, roundUpAmount } = await getOrCreateTestUser()

  // Ensure family + business + additional users exist
  const { familyUserIds, businessUserIds } = await ensureFamilyAndBusiness(userId)

  // Gather all unique user IDs that need transactions
  const allUserIds = [...new Set([userId, ...familyUserIds, ...businessUserIds])]

  // Generate transactions for each user
  const allTransactions = allUserIds.flatMap((uid) => {
    const count = Math.floor(Math.random() * 11) + 8 // 8-18 per user
    const userRoundUp = uid === userId ? roundUpAmount : uid === familyUserIds[1] ? 2 : 3
    return generateRandomTransactions(count, uid, userRoundUp)
  })

  const totalCount = allTransactions.length

  const { data: inserted, error } = await supabaseAdmin
    .from('transactions')
    .insert(allTransactions)
    .select('id')

  if (error) throw new Error(`Bank sync failed: ${error.message}`)

  const insertedIds = (inserted ?? []).map((r: { id: number }) => r.id)

  // Run LLM matching for each user's transactions
  let totalMatched = 0
  let totalFailed = 0
  for (const uid of allUserIds) {
    const userTxIds = insertedIds.filter((_id, i) => allTransactions[i]?.user_id === uid)
    if (userTxIds.length > 0) {
      const result = await processTransactionsLlmMatching(userTxIds, uid)
      totalMatched += result.matched
      totalFailed += result.failed
    }
  }

  return { count: totalCount, matched: totalMatched, failed: totalFailed }
}
