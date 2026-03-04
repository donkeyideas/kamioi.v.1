import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const CREDENTIAL_KEYS = [
  'twitter_api_key',
  'twitter_api_secret',
  'twitter_access_token',
  'twitter_access_token_secret',
  'linkedin_access_token',
  'linkedin_org_id',
  'facebook_page_id',
  'facebook_page_token',
  'instagram_user_id',
  'instagram_access_token',
]

function maskValue(value: string): string {
  if (!value || value.length <= 4) return '****'
  return '****' + value.slice(-4)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    await requireAdmin(supabase, user.id)

    const body = await req.json()
    const { method } = body

    if (method === 'get') {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .eq('setting_type', 'social_creds')

      if (error) return errorResponse(error.message, 500)

      const masked: Record<string, { masked: string; configured: boolean }> = {}
      for (const row of data ?? []) {
        const val = row.setting_value ?? ''
        masked[row.setting_key] = {
          masked: val ? maskValue(val) : '',
          configured: val.length > 0,
        }
      }

      return jsonResponse(masked)
    }

    if (method === 'save') {
      const { credentials } = body

      if (!credentials || typeof credentials !== 'object') {
        return errorResponse('credentials object is required', 400)
      }

      for (const [key, value] of Object.entries(credentials)) {
        if (!CREDENTIAL_KEYS.includes(key)) continue
        // Skip empty values to avoid overwriting with blank
        if (!value || (typeof value === 'string' && value.trim().length === 0)) continue

        await supabase.from('admin_settings').upsert(
          {
            setting_key: key,
            setting_value: String(value),
            setting_type: 'social_creds',
            description: `Social platform credential: ${key}`,
          },
          { onConflict: 'setting_key' }
        )
      }

      return jsonResponse({ saved: true })
    }

    return errorResponse('Invalid method. Use: get, save', 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message.startsWith('Forbidden') ? 403
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
