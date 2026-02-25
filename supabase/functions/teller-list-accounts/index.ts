import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

/**
 * Lists all linked bank enrollments + accounts for the authenticated user.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const userRecord = await getUserRecord(supabase, user.id)

    // Get enrollments with their accounts
    const { data: enrollments } = await supabase
      .from('teller_enrollments')
      .select('*, teller_accounts(*)')
      .eq('user_id', userRecord.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!enrollments || enrollments.length === 0) {
      return jsonResponse({ enrollments: [], accounts: [] })
    }

    // Flatten accounts
    const accounts = enrollments.flatMap(
      (e: { teller_accounts: unknown[] }) => e.teller_accounts || [],
    )

    return jsonResponse({ enrollments, accounts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
