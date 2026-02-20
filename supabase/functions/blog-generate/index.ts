import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import {
  createServiceClient,
  getAuthUser,
  requireAdmin,
} from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Authenticate user and require admin role
    const { user } = await getAuthUser(req)
    const serviceClient = createServiceClient()
    const adminUser = await requireAdmin(serviceClient, user.id)

    // 2. Parse and validate request body
    const body = await req.json()
    const { topic, keywords, tone, word_count } = body as {
      topic?: string
      keywords?: string[]
      tone?: 'professional' | 'casual' | 'educational'
      word_count?: number
    }

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return errorResponse('topic is required and must be a non-empty string')
    }

    const resolvedTone = tone ?? 'educational'
    const resolvedWordCount = word_count ?? 800

    if (!['professional', 'casual', 'educational'].includes(resolvedTone)) {
      return errorResponse(
        'tone must be one of: professional, casual, educational',
      )
    }

    if (
      typeof resolvedWordCount !== 'number' ||
      resolvedWordCount < 100 ||
      resolvedWordCount > 5000
    ) {
      return errorResponse('word_count must be a number between 100 and 5000')
    }

    // 3. Get DeepSeek API key
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekApiKey) {
      return errorResponse('DeepSeek API key is not configured', 500)
    }

    // 4. Check API balance before calling (singleton table)
    const { data: balanceRow } = await serviceClient
      .from('api_balance')
      .select('id, balance')
      .limit(1)
      .maybeSingle()

    const currentBalance = balanceRow?.balance ?? 0
    if (currentBalance <= 0) {
      return errorResponse('Insufficient API balance', 402)
    }

    // 5. Build prompt
    const keywordsInstruction =
      keywords && keywords.length > 0
        ? `Naturally incorporate these keywords throughout the article: ${keywords.join(', ')}.`
        : ''

    const prompt = `You are a fintech content writer specializing in micro-investing and personal finance.

Write a blog post about: ${topic.trim()}

Requirements:
- Tone: ${resolvedTone}
- Target word count: approximately ${resolvedWordCount} words
- Focus on micro-investing, fintech, and personal finance perspectives
- ${keywordsInstruction}
- Do not use emojis anywhere in the content
- Write clear, engaging content suitable for a fintech platform audience
- Generate an SEO-friendly slug from the title (lowercase, hyphens, no special characters)
- Write a concise excerpt (1-2 sentences) summarizing the article
- Write a meta description optimized for search engines (under 160 characters)
- Suggest relevant tags for categorization

Respond with valid JSON only, no markdown fencing, in this exact structure:
{
  "title": "string",
  "slug": "string",
  "content": "string (full article in markdown format)",
  "excerpt": "string",
  "meta_description": "string",
  "tags": ["string"]
}`

    // 6. Call DeepSeek API
    const deepseekResponse = await fetch(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content:
                'You are a professional fintech content writer. Always respond with valid JSON only. Do not use emojis.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      },
    )

    if (!deepseekResponse.ok) {
      const errBody = await deepseekResponse.text()
      console.error('DeepSeek API error:', deepseekResponse.status, errBody)
      return errorResponse(
        `DeepSeek API request failed with status ${deepseekResponse.status}`,
        502,
      )
    }

    const deepseekData = await deepseekResponse.json()
    const rawContent = deepseekData.choices?.[0]?.message?.content

    if (!rawContent) {
      return errorResponse('DeepSeek returned an empty response', 502)
    }

    // 7. Parse the generated content
    let generated: {
      title: string
      slug: string
      content: string
      excerpt: string
      meta_description: string
      tags: string[]
    }

    try {
      // Strip markdown code fences if present
      const cleaned = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      generated = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse DeepSeek response:', rawContent)
      return errorResponse(
        'Failed to parse AI-generated content. The model returned invalid JSON.',
        502,
      )
    }

    // Validate required fields in the parsed response
    if (
      !generated.title ||
      !generated.slug ||
      !generated.content ||
      !generated.excerpt ||
      !generated.meta_description ||
      !Array.isArray(generated.tags)
    ) {
      return errorResponse(
        'AI response is missing required fields (title, slug, content, excerpt, meta_description, tags)',
        502,
      )
    }

    // Calculate actual word count
    const actualWordCount = generated.content
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length

    // 8. Estimate token usage and cost for logging
    const promptTokens = deepseekData.usage?.prompt_tokens ?? 0
    const completionTokens = deepseekData.usage?.completion_tokens ?? 0
    const totalTokens = promptTokens + completionTokens
    // DeepSeek pricing estimate (approximate cost per 1K tokens)
    const estimatedCost = parseFloat(
      ((totalTokens / 1000) * 0.002).toFixed(6),
    )

    // 9. Log to api_usage
    await serviceClient.from('api_usage').insert({
      user_id: adminUser.id,
      endpoint: 'blog-generate',
      model: 'deepseek-chat',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost: estimatedCost,
      success: true,
      request_data: JSON.stringify({ topic: topic.trim(), tone: resolvedTone }),
      page_tab: 'content-marketing',
    })

    // 10. Deduct from api_balance (singleton table)
    const { data: balRow } = await serviceClient
      .from('api_balance')
      .select('id, balance')
      .limit(1)
      .single()

    if (balRow) {
      await serviceClient
        .from('api_balance')
        .update({ balance: Math.max(0, balRow.balance - estimatedCost) })
        .eq('id', balRow.id)
    }

    // 11. Return the generated content for admin review (not auto-saved)
    const generatedAt = new Date().toISOString()

    return jsonResponse({
      title: generated.title,
      slug: generated.slug,
      content: generated.content,
      excerpt: generated.excerpt,
      meta_description: generated.meta_description,
      tags: generated.tags,
      word_count: actualWordCount,
      generated_at: generatedAt,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Internal server error'
    const status =
      message === 'Unauthorized'
        ? 401
        : message.startsWith('Forbidden')
          ? 403
          : 500
    return errorResponse(message, status)
  }
})
