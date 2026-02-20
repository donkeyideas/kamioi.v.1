import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

type ExportType = 'transactions' | 'portfolio' | 'goals' | 'all'

const VALID_EXPORT_TYPES: ExportType[] = ['transactions', 'portfolio', 'goals', 'all']

/**
 * Escape a CSV field value. Wraps in quotes if it contains commas, quotes, or newlines.
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Build CSV content from headers and rows.
 */
function buildCSV(headers: string[], rows: Record<string, unknown>[], keys: string[]): string {
  const lines: string[] = []
  lines.push(headers.map(escapeCSV).join(','))
  for (const row of rows) {
    const values = keys.map((k) => escapeCSV(row[k]))
    lines.push(values.join(','))
  }
  return lines.join('\n')
}

/**
 * Build the transactions CSV section.
 */
function buildTransactionsCSV(data: Record<string, unknown>[]): string {
  const headers = ['Date', 'Merchant', 'Amount', 'Category', 'Round-Up', 'Fee', 'Ticker', 'Status']
  const keys = ['date', 'merchant', 'amount', 'category', 'round_up', 'fee', 'ticker', 'status']
  return buildCSV(headers, data, keys)
}

/**
 * Build the portfolio CSV section.
 */
function buildPortfolioCSV(data: Record<string, unknown>[]): string {
  const headers = ['Ticker', 'Shares', 'Average Price', 'Current Price', 'Total Value']
  const keys = ['ticker', 'shares', 'average_price', 'current_price', 'total_value']
  return buildCSV(headers, data, keys)
}

/**
 * Build the goals CSV section.
 */
function buildGoalsCSV(data: Record<string, unknown>[]): string {
  const headers = ['Title', 'Target', 'Current', 'Progress', 'Type']
  const keys = ['title', 'target_amount', 'current_amount', 'progress', 'goal_type']
  return buildCSV(headers, data, keys)
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

    // 1. Authenticate user
    const { user } = await getAuthUser(req)
    const serviceClient = createServiceClient()
    const userRecord = await getUserRecord(serviceClient, user.id)

    // Parse request body
    const body = await req.json()
    const {
      export_type,
      date_from,
      date_to,
      format: _format,
      user_id: targetUserId,
    } = body

    if (!export_type || !VALID_EXPORT_TYPES.includes(export_type)) {
      return errorResponse(
        `export_type is required and must be one of: ${VALID_EXPORT_TYPES.join(', ')}`,
      )
    }

    // Determine which user's data to export
    let exportUserId = userRecord.id

    if (targetUserId && targetUserId !== userRecord.id) {
      // Only admins can export another user's data
      await requireAdmin(serviceClient, user.id)
      exportUserId = targetUserId
    }

    // 2. Fetch data based on export_type
    const sections: string[] = []
    let filenameType = export_type

    // -- Transactions --
    if (export_type === 'transactions' || export_type === 'all') {
      let query = serviceClient
        .from('transactions')
        .select('date, merchant, amount, category, round_up, fee, ticker, status')
        .eq('user_id', exportUserId)
        .order('date', { ascending: false })

      if (date_from) {
        query = query.gte('date', date_from)
      }
      if (date_to) {
        query = query.lte('date', date_to)
      }

      const { data: transactions, error: txnError } = await query

      if (txnError) {
        return errorResponse(`Failed to fetch transactions: ${txnError.message}`, 500)
      }

      const csv = buildTransactionsCSV(transactions ?? [])
      if (export_type === 'all') {
        sections.push('--- Transactions ---')
      }
      sections.push(csv)
    }

    // -- Portfolio --
    if (export_type === 'portfolio' || export_type === 'all') {
      const { data: holdings, error: holdError } = await serviceClient
        .from('portfolios')
        .select('ticker, shares, average_price, current_price, total_value')
        .eq('user_id', exportUserId)
        .order('ticker', { ascending: true })

      if (holdError) {
        return errorResponse(`Failed to fetch portfolio: ${holdError.message}`, 500)
      }

      const csv = buildPortfolioCSV(holdings ?? [])
      if (export_type === 'all') {
        sections.push('')
        sections.push('--- Portfolio ---')
      }
      sections.push(csv)
    }

    // -- Goals --
    if (export_type === 'goals' || export_type === 'all') {
      const { data: goals, error: goalsError } = await serviceClient
        .from('goals')
        .select('title, target_amount, current_amount, progress, goal_type')
        .eq('user_id', exportUserId)
        .order('title', { ascending: true })

      if (goalsError) {
        return errorResponse(`Failed to fetch goals: ${goalsError.message}`, 500)
      }

      const csv = buildGoalsCSV(goals ?? [])
      if (export_type === 'all') {
        sections.push('')
        sections.push('--- Goals ---')
      }
      sections.push(csv)
    }

    // 3. Build final CSV content
    const csvContent = sections.join('\n')

    // 4. Generate filename
    const today = new Date().toISOString().split('T')[0]
    if (export_type === 'all') {
      filenameType = 'all'
    }
    const filename = `kamioi-export-${filenameType}-${today}.csv`

    // 5. Log system event
    await serviceClient.from('system_events').insert({
      event_type: 'data_export',
      source: 'export-data',
      data: {
        user_id: exportUserId,
        requested_by: userRecord.id,
        export_type,
        date_from: date_from ?? null,
        date_to: date_to ?? null,
      },
    })

    // 6. Return CSV as downloadable response
    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : message === 'Forbidden: admin only' ? 403
      : 500
    return errorResponse(message, status)
  }
})
