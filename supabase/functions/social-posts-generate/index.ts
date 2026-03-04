import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const VALID_TONES = ['Informative', 'Engaging', 'Promotional', 'Controversial']

const PLATFORM_CONFIG: Record<string, { maxChars: number; maxTokens: number; style: string }> = {
  TWITTER: { maxChars: 280, maxTokens: 150, style: 'concise, punchy, conversational. Include 2-3 relevant hashtags inline.' },
  LINKEDIN: { maxChars: 3000, maxTokens: 600, style: 'professional, thought-leadership, insightful. Include 3-5 relevant hashtags at the end.' },
  FACEBOOK: { maxChars: 2000, maxTokens: 400, style: 'conversational, engaging, community-oriented. Include 1-2 relevant hashtags.' },
  INSTAGRAM: { maxChars: 2200, maxTokens: 400, style: 'visual-friendly, storytelling, relatable. Include 5-10 relevant hashtags at the end.' },
  TIKTOK: { maxChars: 2200, maxTokens: 300, style: 'trendy, casual, Gen-Z friendly. Include trending hashtags.' },
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const adminUser = await requireAdmin(supabase, user.id)

    const { topic, tone = 'Informative', platforms } = await req.json()

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return errorResponse('topic is required', 400)
    }
    if (!Array.isArray(platforms) || platforms.length === 0) {
      return errorResponse('platforms array is required and must not be empty', 400)
    }
    if (!VALID_TONES.includes(tone)) {
      return errorResponse(`Invalid tone. Use: ${VALID_TONES.join(', ')}`, 400)
    }

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekApiKey) return errorResponse('DEEPSEEK_API_KEY is not configured', 500)

    // Check API balance
    const { data: balanceRow } = await supabase
      .from('api_balance')
      .select('id, balance')
      .limit(1)
      .maybeSingle()

    if ((balanceRow?.balance ?? 0) <= 0) {
      return errorResponse('Insufficient API balance', 402)
    }

    const startTime = Date.now()

    // Generate posts in parallel
    const results = await Promise.allSettled(
      platforms.map(async (platform: string) => {
        const config = PLATFORM_CONFIG[platform]
        if (!config) throw new Error(`Unknown platform: ${platform}`)

        const prompt = `You are a social media manager for Kamioi, a micro-investing fintech platform that helps people invest spare change into stocks.

Write a ${platform} post about: ${topic}
Tone: ${tone}
Maximum characters: ${config.maxChars}
Style: ${config.style}

Respond with valid JSON only, no markdown fences or extra text:
{
  "content": "the post text without any markdown formatting",
  "hashtags": ["tag1", "tag2"],
  "image_prompt": "a DALL-E style prompt describing an image to accompany this post"
}`

        const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            temperature: 0.8,
            max_tokens: config.maxTokens,
            messages: [
              { role: 'system', content: 'You are a social media content creator. Respond with valid JSON only, no markdown fences or extra text.' },
              { role: 'user', content: prompt },
            ],
          }),
        })

        if (!aiRes.ok) {
          const errBody = await aiRes.text()
          throw new Error(`DeepSeek API returned ${aiRes.status}: ${errBody}`)
        }

        const aiData = await aiRes.json()
        const raw = aiData.choices?.[0]?.message?.content ?? ''
        const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleaned)

        // Post-processing: strip markdown artifacts
        let content = (parsed.content ?? '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .trim()

        // Enforce character limit
        if (content.length > config.maxChars) {
          content = content.substring(0, config.maxChars - 3) + '...'
        }

        return {
          platform,
          content,
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
          image_prompt: parsed.image_prompt || null,
          tokens: aiData.usage?.total_tokens ?? 0,
        }
      })
    )

    const processingTimeMs = Date.now() - startTime

    // Separate successes and failures
    const generated: Array<{ platform: string; content: string; hashtags: string[]; image_prompt: string | null }> = []
    const errors: Array<{ platform: string; error: string }> = []
    let totalTokens = 0

    for (let i = 0; i < results.length; i++) {
      const r = results[i]
      if (r.status === 'fulfilled') {
        totalTokens += r.value.tokens
        generated.push({
          platform: r.value.platform,
          content: r.value.content,
          hashtags: r.value.hashtags,
          image_prompt: r.value.image_prompt,
        })
      } else {
        errors.push({
          platform: platforms[i],
          error: r.reason?.message ?? 'Unknown error',
        })
      }
    }

    const estimatedCost = parseFloat(((totalTokens / 1000) * 0.002).toFixed(6))

    // Log to api_usage
    await supabase.from('api_usage').insert({
      user_id: adminUser.id,
      endpoint: 'social-posts-generate',
      model: 'deepseek-chat',
      cost: estimatedCost,
      success: errors.length === 0,
      request_data: JSON.stringify({ topic, tone, platforms }),
      processing_time_ms: processingTimeMs,
    })

    // Log to ai_responses
    await supabase.from('ai_responses').insert({
      merchant_name: null,
      category: 'social-post-generation',
      prompt: `Topic: ${topic} | Tone: ${tone} | Platforms: ${platforms.join(',')}`,
      raw_response: JSON.stringify(results),
      parsed_response: JSON.stringify(generated),
      processing_time_ms: processingTimeMs,
      model_version: 'deepseek-chat',
      is_error: errors.length > 0,
    })

    // Deduct from api_balance
    if (balanceRow && estimatedCost > 0) {
      await supabase
        .from('api_balance')
        .update({ balance: Math.max(0, balanceRow.balance - estimatedCost) })
        .eq('id', balanceRow.id)
    }

    return jsonResponse({ generated, errors, cost: estimatedCost })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message.startsWith('Forbidden') ? 403
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
