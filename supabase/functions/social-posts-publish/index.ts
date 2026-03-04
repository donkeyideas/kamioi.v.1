import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

// Credential keys per platform
const PLATFORM_CRED_KEYS: Record<string, string[]> = {
  TWITTER: ['twitter_api_key', 'twitter_api_secret', 'twitter_access_token', 'twitter_access_token_secret'],
  LINKEDIN: ['linkedin_access_token', 'linkedin_org_id'],
  FACEBOOK: ['facebook_page_id', 'facebook_page_token'],
  INSTAGRAM: ['instagram_user_id', 'instagram_access_token'],
  TIKTOK: [],
}

// OAuth 1.0a signature helpers for Twitter
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
  body?: string,
): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.twitter_api_key,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.twitter_access_token,
    oauth_version: '1.0',
  }

  // Collect all params for signature base
  const allParams = { ...oauthParams }
  const paramString = Object.keys(allParams)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&')

  const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`
  const signingKey = `${percentEncode(creds.twitter_api_secret)}&${percentEncode(creds.twitter_access_token_secret)}`
  const signature = await hmacSha1(signingKey, signatureBase)

  oauthParams.oauth_signature = signature

  const header = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ')

  return header
}

async function publishToTwitter(creds: Record<string, string>, content: string): Promise<string> {
  const required = ['twitter_api_key', 'twitter_api_secret', 'twitter_access_token', 'twitter_access_token_secret']
  for (const key of required) {
    if (!creds[key]) throw new Error(`Missing Twitter credential: ${key}`)
  }

  // Truncate to 280 chars
  const text = content.length > 280 ? content.substring(0, 277) + '...' : content
  const url = 'https://api.twitter.com/2/tweets'
  const bodyStr = JSON.stringify({ text })

  const authHeader = await buildOAuth1Header('POST', url, creds, bodyStr)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: bodyStr,
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Twitter API ${res.status}: ${errBody}`)
  }

  const data = await res.json()
  return data.data?.id ?? ''
}

async function publishToLinkedIn(creds: Record<string, string>, content: string): Promise<string> {
  if (!creds.linkedin_access_token) throw new Error('Missing LinkedIn access token')
  if (!creds.linkedin_org_id) throw new Error('Missing LinkedIn organization/person URN')

  const urn = creds.linkedin_org_id.startsWith('urn:') ? creds.linkedin_org_id : `urn:li:person:${creds.linkedin_org_id}`

  const res = await fetch('https://api.linkedin.com/v2/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${creds.linkedin_access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: urn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`LinkedIn API ${res.status}: ${errBody}`)
  }

  const postId = res.headers.get('x-restli-id') ?? ''
  return postId
}

async function publishToFacebook(creds: Record<string, string>, content: string): Promise<string> {
  if (!creds.facebook_page_token) throw new Error('Missing Facebook page access token')
  if (!creds.facebook_page_id) throw new Error('Missing Facebook page ID')

  const url = `https://graph.facebook.com/v19.0/${creds.facebook_page_id}/feed`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: content,
      access_token: creds.facebook_page_token,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Facebook API ${res.status}: ${errBody}`)
  }

  const data = await res.json()
  return data.id ?? ''
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    await requireAdmin(supabase, user.id)

    const { post_id } = await req.json()
    if (!post_id) return errorResponse('post_id is required', 400)

    // Fetch the post
    const { data: post, error: fetchErr } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('id', post_id)
      .single()

    if (fetchErr || !post) return errorResponse('Post not found', 404)
    if (post.status === 'PUBLISHED') return errorResponse('Post is already published', 400)

    // Check platform support
    if (post.platform === 'INSTAGRAM') {
      return errorResponse('Instagram does not support text-only posts via API', 400)
    }
    if (post.platform === 'TIKTOK') {
      return errorResponse('TikTok publishing is not yet implemented', 400)
    }

    // Load credentials
    const credKeys = PLATFORM_CRED_KEYS[post.platform] ?? []
    if (credKeys.length === 0) {
      return errorResponse(`No credentials configured for ${post.platform}`, 400)
    }

    const { data: credRows } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', credKeys)

    const creds: Record<string, string> = {}
    for (const row of credRows ?? []) {
      if (row.setting_value) creds[row.setting_key] = row.setting_value
    }

    // Append hashtags to content
    let fullContent = post.content
    if (post.hashtags && post.hashtags.length > 0) {
      const hashtagStr = post.hashtags.map((t: string) => t.startsWith('#') ? t : `#${t}`).join(' ')
      // Deduplicate: don't append tags already in content
      const existingTags = new Set(
        (fullContent.match(/#\w+/g) ?? []).map((t: string) => t.toLowerCase())
      )
      const newTags = post.hashtags
        .map((t: string) => t.startsWith('#') ? t : `#${t}`)
        .filter((t: string) => !existingTags.has(t.toLowerCase()))
      if (newTags.length > 0) {
        fullContent = `${fullContent}\n\n${newTags.join(' ')}`
      }
    }

    // Publish
    try {
      let platformPostId = ''

      switch (post.platform) {
        case 'TWITTER':
          platformPostId = await publishToTwitter(creds, fullContent)
          break
        case 'LINKEDIN':
          platformPostId = await publishToLinkedIn(creds, fullContent)
          break
        case 'FACEBOOK':
          platformPostId = await publishToFacebook(creds, fullContent)
          break
        default:
          return errorResponse(`Publishing to ${post.platform} is not supported`, 400)
      }

      // Update post status
      await supabase
        .from('social_media_posts')
        .update({
          status: 'PUBLISHED',
          published_at: new Date().toISOString(),
          platform_post_id: platformPostId,
          error_message: null,
        })
        .eq('id', post_id)

      return jsonResponse({ success: true, platform_post_id: platformPostId })
    } catch (pubErr) {
      const errMsg = pubErr instanceof Error ? pubErr.message : 'Unknown publishing error'

      await supabase
        .from('social_media_posts')
        .update({ status: 'FAILED', error_message: errMsg })
        .eq('id', post_id)

      return errorResponse(`Publishing failed: ${errMsg}`, 502)
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
