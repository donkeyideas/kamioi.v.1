import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { tellerGet } from '../_shared/teller.ts'

/**
 * Called after Teller Connect completes on the frontend.
 * Saves the enrollment + access token, fetches accounts, triggers initial sync.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const userRecord = await getUserRecord(supabase, user.id)

    const { access_token, enrollment_id, institution } = await req.json()

    if (!access_token || !enrollment_id) {
      return errorResponse('access_token and enrollment_id are required', 400)
    }

    // Check if enrollment already saved
    const { data: existing } = await supabase
      .from('teller_enrollments')
      .select('id')
      .eq('enrollment_id', enrollment_id)
      .maybeSingle()

    if (existing) {
      return jsonResponse({ success: true, enrollment_id, message: 'Already saved' })
    }

    // Save enrollment
    const { data: enrollment, error: enrollErr } = await supabase
      .from('teller_enrollments')
      .insert({
        user_id: userRecord.id,
        enrollment_id,
        access_token,
        institution_name: institution?.name || null,
        institution_id: institution?.id || null,
      })
      .select('id')
      .single()

    if (enrollErr) {
      return errorResponse(`Failed to save enrollment: ${enrollErr.message}`, 500)
    }

    // Fetch accounts from Teller API
    try {
      const accounts = await tellerGet('/accounts', access_token)

      if (Array.isArray(accounts) && accounts.length > 0) {
        const accountRows = accounts.map((acct: {
          id: string
          name: string
          type: string
          subtype: string
          institution: { name: string; id: string }
          last_four: string
        }) => ({
          enrollment_id: enrollment.id,
          user_id: userRecord.id,
          teller_account_id: acct.id,
          account_name: acct.name,
          account_type: acct.type,
          account_subtype: acct.subtype,
          institution_name: acct.institution?.name || institution?.name || null,
          last_four: acct.last_four || null,
        }))

        await supabase.from('teller_accounts').insert(accountRows)
      }
    } catch (acctErr) {
      console.error('Failed to fetch Teller accounts:', acctErr)
    }

    return jsonResponse({
      success: true,
      enrollment_id,
      enrollment_db_id: enrollment.id,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
