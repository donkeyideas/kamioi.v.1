import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ParsedItem {
  name: string
  brand: string | null
  amount: number
  brandSymbol: string | null
  brandConfidence: number
}

interface ParsedReceipt {
  retailer: { name: string; stockSymbol: string | null }
  items: ParsedItem[]
  totalAmount: number
  timestamp: string
}

interface Allocation {
  stockSymbol: string
  stockName: string
  amount: number
  percentage: number
  reason: string
  confidence: number
}

/* -------------------------------------------------------------------------- */
/*  AI Vision Provider Calls                                                   */
/* -------------------------------------------------------------------------- */

const EXTRACTION_PROMPT = `You are a receipt parser. Analyze this receipt image and extract structured data.

Return ONLY valid JSON with this exact schema (no markdown, no extra text):
{
  "retailer": "Store/merchant name exactly as shown",
  "items": [
    {
      "name": "Item name as shown on receipt",
      "brand": "Brand name if identifiable (Nike, Apple, etc.) or null",
      "amount": 12.99
    }
  ],
  "totalAmount": 99.99
}

Rules:
- Extract the store/retailer name from the top of the receipt
- List each line item with its price
- For brand, only include if you can clearly identify a consumer brand (Nike, Apple, Samsung, etc.)
- totalAmount should be the final total including tax
- Amounts must be numbers, not strings
- If you cannot determine a value, use null for brand and 0 for amounts`

async function callDeepSeek(base64Image: string, mimeType: string, apiKey: string) {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You are an expert receipt parser. Respond only with valid JSON, no markdown or extra text.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${errBody}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function callClaude(base64Image: string, mimeType: string, apiKey: string) {
  const mediaType = mimeType === 'application/pdf' ? 'application/pdf' : mimeType
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Claude API error ${res.status}: ${errBody}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

async function callOpenAI(base64Image: string, mimeType: string, apiKey: string) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: 'You are an expert receipt parser. Respond only with valid JSON, no markdown or extra text.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${errBody}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function parseAIResponse(raw: string): { retailer: string; items: Array<{ name: string; brand: string | null; amount: number }>; totalAmount: number } {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned)
}

/** Resolve which API key to use: user BYOK → platform env var */
function resolveApiKey(
  provider: string,
  userSettings: Record<string, string>,
): string {
  const settingKey = `${provider}_api_key`
  const userKey = userSettings[settingKey]
  if (userKey) return userKey

  const envMap: Record<string, string> = {
    deepseek: 'DEEPSEEK_API_KEY',
    claude: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
  }
  const envKey = Deno.env.get(envMap[provider] ?? '')
  if (!envKey) {
    throw new Error(
      `No API key available for ${provider}. Configure a platform key or add your own in Settings.`,
    )
  }
  return envKey
}

/** Cost estimates per provider call (for api_balance tracking) */
const PROVIDER_COSTS: Record<string, number> = {
  deepseek: 0.003,
  claude: 0.008,
  openai: 0.005,
}

/* -------------------------------------------------------------------------- */
/*  Main handler                                                               */
/* -------------------------------------------------------------------------- */

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Auth
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const userRecord = await getUserRecord(supabase, user.id)
    const startTime = Date.now()

    // 2. Parse request
    const { receipt_id } = await req.json()
    if (!receipt_id) return errorResponse('receipt_id is required')

    // 3. Fetch receipt & verify ownership
    const { data: receipt, error: receiptErr } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receipt_id)
      .single()

    if (receiptErr || !receipt) return errorResponse('Receipt not found', 404)
    if (receipt.user_id !== userRecord.id) {
      return errorResponse('Receipt does not belong to this user', 403)
    }

    // Update status to processing
    await supabase
      .from('receipts')
      .update({ status: 'processing' })
      .eq('id', receipt_id)

    // 4. Download image from storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from('receipts')
      .download(receipt.storage_path)

    if (downloadErr || !fileData) {
      await supabase
        .from('receipts')
        .update({ status: 'failed', error_message: 'Failed to download file from storage' })
        .eq('id', receipt_id)
      return errorResponse('Failed to download receipt file', 500)
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i])
    }
    const base64Image = btoa(binary)

    // 5. Determine AI provider
    const { data: settingsRows } = await supabase
      .from('user_settings')
      .select('setting_key, setting_value')
      .eq('user_id', userRecord.id)
      .in('setting_key', [
        'ai_vision_provider',
        'deepseek_api_key',
        'claude_api_key',
        'openai_api_key',
      ])

    const userSettings: Record<string, string> = {}
    for (const row of settingsRows ?? []) {
      userSettings[row.setting_key] = row.setting_value
    }

    const provider = userSettings.ai_vision_provider || 'deepseek'
    const isUserKey = !!userSettings[`${provider}_api_key`]

    let apiKey: string
    try {
      apiKey = resolveApiKey(provider, userSettings)
    } catch (keyErr) {
      await supabase
        .from('receipts')
        .update({ status: 'failed', error_message: (keyErr as Error).message })
        .eq('id', receipt_id)
      return errorResponse((keyErr as Error).message, 400)
    }

    // 6. Call AI Vision API
    let rawContent: string
    try {
      const mimeType = receipt.file_type
      if (provider === 'claude') {
        rawContent = await callClaude(base64Image, mimeType, apiKey)
      } else if (provider === 'openai') {
        rawContent = await callOpenAI(base64Image, mimeType, apiKey)
      } else {
        rawContent = await callDeepSeek(base64Image, mimeType, apiKey)
      }
    } catch (aiErr) {
      const processingTimeMs = Date.now() - startTime
      // Log failure
      await supabase.from('ai_responses').insert({
        merchant_name: receipt.filename,
        prompt: EXTRACTION_PROMPT.slice(0, 500),
        raw_response: (aiErr as Error).message,
        parsed_response: null,
        processing_time_ms: processingTimeMs,
        model_version: provider,
        is_error: true,
      })
      await supabase
        .from('receipts')
        .update({
          status: 'failed',
          ai_provider: provider,
          error_message: `AI extraction failed: ${(aiErr as Error).message}`,
        })
        .eq('id', receipt_id)
      return errorResponse(`AI extraction failed: ${(aiErr as Error).message}`, 502)
    }

    // 7. Parse AI response
    let extracted: ReturnType<typeof parseAIResponse>
    try {
      extracted = parseAIResponse(rawContent)
    } catch {
      await supabase
        .from('receipts')
        .update({
          status: 'failed',
          ai_provider: provider,
          raw_ocr_text: rawContent,
          error_message: 'Failed to parse AI response as JSON',
        })
        .eq('id', receipt_id)
      return errorResponse('AI returned invalid JSON. Try manual entry.', 422)
    }

    // 8. Brand-to-ticker mapping
    const retailerName = extracted.retailer || 'Unknown'
    let retailerSymbol: string | null = null

    // Check llm_mappings for retailer
    const { data: retailerMapping } = await supabase
      .from('llm_mappings')
      .select('ticker, company_name, confidence')
      .ilike('merchant_name', retailerName)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()

    if (retailerMapping) {
      retailerSymbol = retailerMapping.ticker
    }

    // Map each item's brand to a ticker
    const mappedItems: ParsedItem[] = []
    for (const item of extracted.items) {
      let brandSymbol: string | null = null
      let brandConfidence = 0

      if (item.brand) {
        const { data: brandMapping } = await supabase
          .from('llm_mappings')
          .select('ticker, company_name, confidence')
          .ilike('merchant_name', item.brand)
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle()

        if (brandMapping) {
          brandSymbol = brandMapping.ticker
          brandConfidence = brandMapping.confidence ?? 0.8
        }
      }

      mappedItems.push({
        name: item.name,
        brand: item.brand,
        amount: item.amount ?? 0,
        brandSymbol,
        brandConfidence,
      })
    }

    // 9. Calculate weighted allocation
    const defaultRoundUp: number = userRecord.round_up_amount ?? 1
    const totalAmount = extracted.totalAmount || 0

    // Collect relevant stocks with weights
    const stockWeights: Array<{
      symbol: string
      name: string
      weight: number
      confidence: number
      reason: string
    }> = []

    // Add retailer stock (base weight = 1.0)
    if (retailerSymbol) {
      stockWeights.push({
        symbol: retailerSymbol,
        name: retailerName,
        weight: 1.0,
        confidence: retailerMapping?.confidence ?? 1.0,
        reason: `Purchase at ${retailerName}`,
      })
    }

    // Add brand stocks weighted by item amount proportion
    for (const item of mappedItems) {
      if (item.brandSymbol && item.brandConfidence > 0.7) {
        // Check if this symbol is already in the list
        const existing = stockWeights.find(s => s.symbol === item.brandSymbol)
        if (existing) {
          // Add to existing weight
          existing.weight += totalAmount > 0 ? (item.amount / totalAmount) : 0.5
        } else if (stockWeights.length < 5) {
          stockWeights.push({
            symbol: item.brandSymbol,
            name: item.brand || item.name,
            weight: totalAmount > 0 ? (item.amount / totalAmount) : 0.5,
            confidence: item.brandConfidence,
            reason: `Purchased ${item.brand || item.name} products`,
          })
        }
      }
    }

    // Normalize weights
    const totalWeight = stockWeights.reduce((sum, s) => sum + s.weight, 0)

    const allocations: Allocation[] = []
    let allocated = 0

    for (let i = 0; i < stockWeights.length; i++) {
      const s = stockWeights[i]
      const pct = totalWeight > 0 ? (s.weight / totalWeight) * 100 : 0
      const isLast = i === stockWeights.length - 1
      const amt = isLast
        ? parseFloat((defaultRoundUp - allocated).toFixed(2))
        : parseFloat(((pct / 100) * defaultRoundUp).toFixed(2))

      // Ensure minimum $0.01 allocation
      const finalAmt = Math.max(0.01, amt)
      allocated += finalAmt

      allocations.push({
        stockSymbol: s.symbol,
        stockName: s.name,
        amount: finalAmt,
        percentage: parseFloat(pct.toFixed(1)),
        reason: `${s.reason} (confidence: ${(s.confidence * 100).toFixed(0)}%)`,
        confidence: s.confidence,
      })
    }

    // Build parsed data
    const parsedData: ParsedReceipt = {
      retailer: { name: retailerName, stockSymbol: retailerSymbol },
      items: mappedItems,
      totalAmount,
      timestamp: new Date().toISOString(),
    }

    const allocationData = {
      allocations,
      totalRoundUp: defaultRoundUp,
    }

    // 10. Update receipt record
    const status = allocations.length > 0 ? 'allocated' : 'parsed'
    await supabase
      .from('receipts')
      .update({
        status,
        ai_provider: provider,
        raw_ocr_text: rawContent,
        parsed_data: parsedData,
        allocation_data: allocationData,
        round_up_amount: defaultRoundUp,
      })
      .eq('id', receipt_id)

    // 11. Log to ai_responses + track cost
    const processingTimeMs = Date.now() - startTime

    await supabase.from('ai_responses').insert({
      merchant_name: retailerName,
      prompt: EXTRACTION_PROMPT.slice(0, 500),
      raw_response: rawContent,
      parsed_response: JSON.stringify(parsedData),
      processing_time_ms: processingTimeMs,
      model_version: provider,
      is_error: false,
    })

    // Deduct from api_balance only if platform key was used
    if (!isUserKey) {
      const cost = PROVIDER_COSTS[provider] ?? 0.005
      const { data: balanceRecord } = await supabase
        .from('api_balance')
        .select('id, balance')
        .limit(1)
        .single()

      if (balanceRecord) {
        const newBalance = Math.max(0, balanceRecord.balance - cost)
        await supabase
          .from('api_balance')
          .update({ balance: newBalance })
          .eq('id', balanceRecord.id)

        await supabase.from('api_usage').insert({
          endpoint: 'receipt-process',
          model: provider,
          cost,
          request_data: `receipt:${receipt_id}`,
          user_id: userRecord.id,
          processing_time_ms: processingTimeMs,
          success: true,
        })
      }
    }

    // 12. Return result
    return jsonResponse({
      receipt_id,
      status,
      parsed_data: parsedData,
      allocation_data: allocationData,
      ai_provider: provider,
      processing_time_ms: processingTimeMs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
