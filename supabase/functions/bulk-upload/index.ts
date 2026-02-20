import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const MAX_ROWS = 500
const EXPECTED_HEADERS = ['date', 'merchant', 'amount']
const OPTIONAL_HEADERS = ['category', 'description']

/**
 * Parse a single CSV line, handling quoted fields that may contain commas.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip next quote
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  fields.push(current.trim())
  return fields
}

/**
 * Validate and normalise a date string. Accepts ISO (YYYY-MM-DD) or MM/DD/YYYY.
 * Returns ISO date string or null if invalid.
 */
function parseDate(raw: string): string | null {
  // Try ISO format: YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return raw
  }

  // Try MM/DD/YYYY
  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    const d = new Date(iso)
    if (!isNaN(d.getTime())) return iso
  }

  return null
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Authenticate user and get user record
    const { user } = await getAuthUser(req)
    const serviceClient = createServiceClient()
    const userRecord = await getUserRecord(serviceClient, user.id)
    const defaultRoundUp: number = userRecord.round_up_amount ?? 1

    // Parse request body
    const body = await req.json()
    const { csv_data } = body

    if (!csv_data || typeof csv_data !== 'string') {
      return errorResponse('csv_data is required and must be a string')
    }

    // 2. Parse CSV lines
    const lines = csv_data
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)

    if (lines.length < 2) {
      return errorResponse('CSV must contain a header row and at least one data row')
    }

    // 3. Validate header row
    const headerFields = parseCSVLine(lines[0]).map((h: string) => h.toLowerCase())

    for (const required of EXPECTED_HEADERS) {
      if (!headerFields.includes(required)) {
        return errorResponse(
          `Missing required CSV column: ${required}. Expected columns: ${[...EXPECTED_HEADERS, ...OPTIONAL_HEADERS].join(', ')}`,
        )
      }
    }

    const colIndex: Record<string, number> = {}
    for (let i = 0; i < headerFields.length; i++) {
      colIndex[headerFields[i]] = i
    }

    const dataLines = lines.slice(1)

    if (dataLines.length > MAX_ROWS) {
      return errorResponse(`Maximum ${MAX_ROWS} rows per upload. Received ${dataLines.length} rows.`)
    }

    // Fetch platform fee rate from admin_settings
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

    // Fetch existing transactions for this user to detect duplicates
    const { data: existingTxns } = await serviceClient
      .from('transactions')
      .select('date, merchant, amount')
      .eq('user_id', userRecord.id)

    const existingSet = new Set<string>()
    if (existingTxns) {
      for (const t of existingTxns) {
        const key = `${t.date}|${(t.merchant ?? '').toLowerCase()}|${t.amount}`
        existingSet.add(key)
      }
    }

    // 4. Process each data row
    const transactionsToInsert: Record<string, unknown>[] = []
    const errors: { row: number; message: string }[] = []
    let skipped = 0
    let failed = 0

    // Track keys within this upload to also catch intra-batch duplicates
    const batchKeys = new Set<string>()

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2 // 1-indexed, accounting for header
      const fields = parseCSVLine(dataLines[i])

      try {
        // Extract fields by column index
        const rawDate = fields[colIndex['date']] ?? ''
        const rawMerchant = fields[colIndex['merchant']] ?? ''
        const rawAmount = fields[colIndex['amount']] ?? ''
        const rawCategory = colIndex['category'] !== undefined ? (fields[colIndex['category']] ?? '') : ''
        const rawDescription = colIndex['description'] !== undefined ? (fields[colIndex['description']] ?? '') : ''

        // Validate date
        const parsedDate = parseDate(rawDate)
        if (!parsedDate) {
          errors.push({ row: rowNum, message: `Invalid date: "${rawDate}". Use YYYY-MM-DD or MM/DD/YYYY format.` })
          failed++
          continue
        }

        // Validate merchant
        if (!rawMerchant) {
          errors.push({ row: rowNum, message: 'Merchant name is required and cannot be empty.' })
          failed++
          continue
        }

        // Validate amount
        const amount = parseFloat(rawAmount)
        if (isNaN(amount)) {
          errors.push({ row: rowNum, message: `Invalid amount: "${rawAmount}". Must be a valid number.` })
          failed++
          continue
        }

        // Check for duplicates (same date + merchant + amount)
        const dedupKey = `${parsedDate}|${rawMerchant.toLowerCase()}|${amount}`
        if (existingSet.has(dedupKey) || batchKeys.has(dedupKey)) {
          skipped++
          continue
        }
        batchKeys.add(dedupKey)

        // Calculate round-up
        const absAmount = Math.abs(amount)
        const ceilAmount = Math.ceil(absAmount)
        const rawRoundUp = ceilAmount - absAmount
        const roundUp = rawRoundUp === 0
          ? defaultRoundUp
          : parseFloat(rawRoundUp.toFixed(2))

        // Calculate fee
        const fee = parseFloat((roundUp * feeRate).toFixed(2))

        transactionsToInsert.push({
          user_id: userRecord.id,
          date: parsedDate,
          merchant: rawMerchant,
          amount,
          category: rawCategory || null,
          description: rawDescription || null,
          round_up: roundUp,
          fee,
          status: 'pending',
          transaction_type: 'bank',
        })
      } catch (_rowErr) {
        errors.push({ row: rowNum, message: 'Unexpected error parsing row.' })
        failed++
      }
    }

    // 5. Batch insert all valid transactions
    let successful = 0

    if (transactionsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await serviceClient
        .from('transactions')
        .insert(transactionsToInsert)
        .select('id, round_up, fee')

      if (insertError) {
        return errorResponse(
          `Failed to insert transactions: ${insertError.message}`,
          500,
        )
      }

      successful = inserted?.length ?? 0

      // 7. Create roundup_ledger entries for each successful transaction
      if (inserted && inserted.length > 0) {
        const ledgerEntries = inserted.map((txn: { id: number; round_up: number; fee: number }) => ({
          user_id: userRecord.id,
          transaction_id: txn.id,
          round_up_amount: txn.round_up,
          fee_amount: txn.fee,
          status: 'pending',
        }))

        const { error: ledgerError } = await serviceClient
          .from('roundup_ledger')
          .insert(ledgerEntries)

        if (ledgerError) {
          // Log but do not fail the entire upload
          console.error('Failed to insert roundup ledger entries:', ledgerError.message)
        }
      }
    }

    const totalRows = dataLines.length

    // 8. Log system event
    await serviceClient.from('system_events').insert({
      event_type: 'bulk_upload',
      data: {
        user_id: userRecord.id,
        total: totalRows,
        success: successful,
        failed,
        skipped,
      },
    })

    // 9. Return summary
    return jsonResponse({
      total_rows: totalRows,
      successful,
      failed,
      skipped,
      errors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
