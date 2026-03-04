import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

// OAuth 1.0a helpers for Twitter
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

async function buildOAuth1Header(
  method: string,
  url: string,
  creds: Record<string, string>,
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.twitter_api_key,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.twitter_access_token,
    oauth_version: '1.0',
  }

  const paramString = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join('&')

  const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`
  const signingKey = `${percentEncode(creds.twitter_api_secret)}&${percentEncode(creds.twitter_access_token_secret)}`
  const signature = await hmacSha1(signingKey, signatureBase)

  oauthParams.oauth_signature = signature

  return 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    await requireAdmin(supabase, user.id)

    const { platform } = await req.json()
    if (!platform) return errorResponse('platform is required', 400)

    // Unsupported platforms
    if (platform === 'INSTAGRAM') {
      return jsonResponse({ connected: false, error: 'Instagram text-only posts are not supported via API' })
    }
    if (platform === 'TIKTOK') {
      return jsonResponse({ connected: false, error: 'TikTok publishing is not yet implemented' })
    }

    // Load credentials
    const credKeyMap: Record<string, string[]> = {
      TWITTER: ['twitter_api_key', 'twitter_api_secret', 'twitter_access_token', 'twitter_access_token_secret'],
      LINKEDIN: ['linkedin_access_token', 'linkedin_org_id'],
      FACEBOOK: ['facebook_page_id', 'facebook_page_token'],
    }

    const keys = credKeyMap[platform]
    if (!keys) return errorResponse(`Unknown platform: ${platform}`, 400)

    const { data: credRows } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', keys)

    const creds: Record<string, string> = {}
    for (const row of credRows ?? []) {
      if (row.setting_value) creds[row.setting_key] = row.setting_value
    }

    // Check all required keys are present
    const missing = keys.filter(k => !creds[k])
    if (missing.length > 0) {
      return jsonResponse({ connected: false, error: `Missing credentials: ${missing.join(', ')}` })
    }

    // Test connection
    try {
      switch (platform) {
        case 'TWITTER': {
          const url = 'https://api.twitter.com/2/users/me'
          const authHeader = await buildOAuth1Header('GET', url, creds)
          const res = await fetch(url, {
            headers: { 'Authorization': authHeader },
          })
          if (!res.ok) {
            const errBody = await res.text()
            throw new Error(`Twitter API ${res.status}: ${errBody}`)
          }
          const data = await res.json()
          return jsonResponse({
            connected: true,
            account_name: data.data?.name ?? data.data?.username ?? 'Connected',
          })
        }

        case 'LINKEDIN': {
          const res = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${creds.linkedin_access_token}` },
          })
          if (!res.ok) {
            const errBody = await res.text()
            throw new Error(`LinkedIn API ${res.status}: ${errBody}`)
          }
          const data = await res.json()
          return jsonResponse({
            connected: true,
            account_name: data.name ?? data.localizedFirstName ?? 'Connected',
          })
        }

        case 'FACEBOOK': {
          const url = `https://graph.facebook.com/v19.0/${creds.facebook_page_id}?fields=name&access_token=${creds.facebook_page_token}`
          const res = await fetch(url)
          if (!res.ok) {
            const errBody = await res.text()
            throw new Error(`Facebook API ${res.status}: ${errBody}`)
          }
          const data = await res.json()
          return jsonResponse({
            connected: true,
            account_name: data.name ?? 'Connected',
          })
        }

        default:
          return jsonResponse({ connected: false, error: `Unsupported platform: ${platform}` })
      }
    } catch (testErr) {
      return jsonResponse({
        connected: false,
        error: testErr instanceof Error ? testErr.message : 'Connection test failed',
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message.startsWith('Forbidden') ? 403
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
