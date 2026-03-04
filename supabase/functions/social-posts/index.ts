import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const VALID_PLATFORMS = ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK']
const VALID_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELLED']

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const adminUser = await requireAdmin(supabase, user.id)

    const body = await req.json()
    const { method } = body

    switch (method) {
      case 'list': {
        const { status, platform, limit = 50, offset = 0 } = body

        let query = supabase
          .from('social_media_posts')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (status && status !== 'all') query = query.eq('status', status)
        if (platform && platform !== 'all') query = query.eq('platform', platform)

        const { data, error, count } = await query
        if (error) return errorResponse(error.message, 500)

        return jsonResponse({ data: data ?? [], count: count ?? 0 })
      }

      case 'create': {
        const { platform, content, hashtags, image_prompt, status: postStatus, scheduled_at } = body

        if (!platform || !VALID_PLATFORMS.includes(platform)) {
          return errorResponse('Invalid or missing platform', 400)
        }
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          return errorResponse('Content is required', 400)
        }
        if (postStatus && !VALID_STATUSES.includes(postStatus)) {
          return errorResponse('Invalid status', 400)
        }

        const { data, error } = await supabase
          .from('social_media_posts')
          .insert({
            platform,
            content: content.trim(),
            status: postStatus || 'DRAFT',
            hashtags: hashtags || [],
            image_prompt: image_prompt || null,
            scheduled_at: scheduled_at || null,
            created_by: adminUser.id,
          })
          .select()
          .single()

        if (error) return errorResponse(error.message, 500)
        return jsonResponse(data, 201)
      }

      case 'update': {
        const { id, content, status: postStatus, hashtags, image_prompt, scheduled_at } = body

        if (!id) return errorResponse('Post id is required', 400)
        if (postStatus && !VALID_STATUSES.includes(postStatus)) {
          return errorResponse('Invalid status', 400)
        }

        const updates: Record<string, unknown> = {}
        if (content !== undefined) updates.content = content.trim()
        if (postStatus !== undefined) updates.status = postStatus
        if (hashtags !== undefined) updates.hashtags = hashtags
        if (image_prompt !== undefined) updates.image_prompt = image_prompt
        if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at

        if (Object.keys(updates).length === 0) {
          return errorResponse('No fields to update', 400)
        }

        const { data, error } = await supabase
          .from('social_media_posts')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) return errorResponse(error.message, 500)
        return jsonResponse(data)
      }

      case 'delete': {
        const { id } = body
        if (!id) return errorResponse('Post id is required', 400)

        // Only allow deleting non-published posts
        const { data: post } = await supabase
          .from('social_media_posts')
          .select('status')
          .eq('id', id)
          .single()

        if (!post) return errorResponse('Post not found', 404)
        if (post.status === 'PUBLISHED') {
          return errorResponse('Cannot delete a published post', 400)
        }

        const { error } = await supabase
          .from('social_media_posts')
          .delete()
          .eq('id', id)

        if (error) return errorResponse(error.message, 500)
        return jsonResponse({ deleted: true })
      }

      default:
        return errorResponse('Invalid method. Use: list, create, update, delete', 400)
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
