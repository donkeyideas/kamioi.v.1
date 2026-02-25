import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { tellerDelete } from '../_shared/teller.ts'

/**
 * Disconnects a linked bank enrollment.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const userRecord = await getUserRecord(supabase, user.id)

    const { enrollment_id } = await req.json()
    if (!enrollment_id) {
      return errorResponse('enrollment_id is required', 400)
    }

    // Verify this enrollment belongs to the user
    const { data: enrollment } = await supabase
      .from('teller_enrollments')
      .select('id, access_token')
      .eq('enrollment_id', enrollment_id)
      .eq('user_id', userRecord.id)
      .single()

    if (!enrollment) {
      return errorResponse('Enrollment not found or does not belong to user', 404)
    }

    // Try to delete via Teller API
    try {
      // Teller doesn't have a dedicated delete enrollment endpoint,
      // but we can delete individual accounts
      const { data: accounts } = await supabase
        .from('teller_accounts')
        .select('teller_account_id')
        .eq('enrollment_id', enrollment.id)

      for (const acct of accounts || []) {
        try {
          await tellerDelete(`/accounts/${acct.teller_account_id}`, enrollment.access_token)
        } catch {
          // Continue even if API deletion fails
        }
      }
    } catch {
      // If Teller API fails, still deactivate locally
    }

    // Mark as inactive in DB
    await supabase
      .from('teller_enrollments')
      .update({ is_active: false })
      .eq('id', enrollment.id)

    // Deactivate associated accounts
    await supabase
      .from('teller_accounts')
      .update({ is_active: false })
      .eq('enrollment_id', enrollment.id)

    return jsonResponse({ success: true, enrollment_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
