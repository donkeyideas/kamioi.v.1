import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const AUTOMATION_KEYS = [
  'social_auto_enabled',
  'social_auto_platforms',
  'social_auto_cron_hour',
  'social_auto_topic_pool',
  'social_auto_use_domain_content',
  'social_auto_require_approval',
]

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
        .eq('setting_type', 'social_automation')

      if (error) return errorResponse(error.message, 500)

      const config: Record<string, string> = {}
      for (const row of data ?? []) {
        config[row.setting_key] = row.setting_value ?? ''
      }

      return jsonResponse(config)
    }

    if (method === 'save') {
      const { settings } = body

      if (!settings || typeof settings !== 'object') {
        return errorResponse('settings object is required', 400)
      }

      for (const [key, value] of Object.entries(settings)) {
        if (!AUTOMATION_KEYS.includes(key)) continue

        await supabase.from('admin_settings').upsert(
          {
            setting_key: key,
            setting_value: String(value),
            setting_type: 'social_automation',
            description: `Social automation: ${key}`,
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
