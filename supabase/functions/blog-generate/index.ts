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

    const prompt = `You are an expert fintech content writer for Kamioi, a micro-investing platform that rounds up everyday purchases and invests spare change into real stocks.

Write a blog post about: ${topic.trim()}

CONTENT REQUIREMENTS:
- Tone: ${resolvedTone}
- Target word count: approximately ${resolvedWordCount} words
- Focus on micro-investing, fintech, and personal finance perspectives
- ${keywordsInstruction}
- Do not use emojis anywhere in the content

FORMATTING REQUIREMENTS (CRITICAL):
- Write the content as clean HTML -use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <blockquote>, <strong>, <em> tags
- Do NOT use markdown syntax (no asterisks, hash symbols, dashes for lists, or code fences). Output pure HTML tags only
- Do NOT include h1 tags - the title is displayed separately
- Use <strong> for emphasis instead of **
- Use <em> for italics instead of *

LINK REQUIREMENTS:
- Include 2-3 internal links to Kamioi pages using <a href="/features">features</a>, <a href="/how-it-works">how it works</a>, <a href="/pricing">pricing</a>, <a href="/learn">learn</a>, or <a href="/blog">blog</a>
- Include 1-2 external links to reputable financial sources (Investopedia, SEC, NerdWallet, Forbes, etc.)
- Links should be naturally woven into the content, not forced

SEO/GEO/AEO/CRO OPTIMIZATION:
- Structure content with clear H2/H3 headings for AI crawlers and featured snippets
- Include a concise answer paragraph near the top (for voice search and answer engines)
- Use question-based headings where natural (e.g., "What is...", "How does...")
- Include a subtle call-to-action encouraging readers to try Kamioi
- Write content that AI search engines can easily cite and reference

RESPONSE FORMAT -valid JSON only, no markdown fencing:
{
  "title": "string",
  "slug": "string (lowercase-hyphenated)",
  "content": "string (full article in clean HTML)",
  "excerpt": "string (1-2 sentences)",
  "category": "string (e.g., Investing, Personal Finance, Education)",
  "seo_title": "string (30-60 chars, optimized for search)",
  "seo_description": "string (120-160 chars, optimized for search)",
  "seo_keywords": "string (comma-separated keywords)",
  "tags": ["string"],
  "og_title": "string (compelling for social sharing)",
  "og_description": "string (optimized for social previews)"
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
                'You are a professional fintech content writer for Kamioi. Always respond with valid JSON only. Write blog content as clean HTML (h2, h3, p, ul, ol, strong, em, a tags). Never use markdown syntax like **, ##, -, or ```. Do not use emojis.',
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
      category?: string
      seo_title?: string
      seo_description?: string
      seo_keywords?: string
      meta_description?: string
      tags: string[]
      og_title?: string
      og_description?: string
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
      !Array.isArray(generated.tags)
    ) {
      return errorResponse(
        'AI response is missing required fields (title, slug, content, excerpt, tags)',
        502,
      )
    }

    // Strip any remaining markdown syntax from content (safety net)
    generated.content = generated.content
      .replace(/^#{1,6}\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/```[\s\S]*?```/g, '')

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
      category: generated.category ?? 'Investing',
      seo_title: generated.seo_title ?? generated.title,
      seo_description: generated.seo_description ?? generated.meta_description ?? generated.excerpt,
      seo_keywords: generated.seo_keywords ?? generated.tags.join(', '),
      tags: generated.tags,
      og_title: generated.og_title ?? generated.seo_title ?? generated.title,
      og_description: generated.og_description ?? generated.seo_description ?? generated.excerpt,
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
