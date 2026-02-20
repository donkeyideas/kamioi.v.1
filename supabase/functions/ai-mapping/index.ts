import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    // Step 1: Authenticate user
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const userRecord = await getUserRecord(supabase, user.id)

    // Parse request body
    const { merchant_name, category, transaction_id } = await req.json()

    if (!merchant_name || typeof merchant_name !== 'string') {
      return errorResponse('merchant_name is required and must be a string', 400)
    }

    // Step 2: Check if an approved mapping already exists (case-insensitive)
    const { data: existingMapping } = await supabase
      .from('llm_mappings')
      .select('*')
      .ilike('merchant_name', merchant_name)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()

    if (existingMapping) {
      return jsonResponse({
        mapping_id: existingMapping.id,
        merchant_name: existingMapping.merchant_name,
        ticker: existingMapping.ticker,
        company_name: existingMapping.company_name,
        confidence: existingMapping.confidence,
        status: existingMapping.status,
        auto_approved: existingMapping.admin_approved ?? false,
      })
    }

    // Step 3: Get DeepSeek API key
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekApiKey) {
      return errorResponse('DEEPSEEK_API_KEY is not configured', 500)
    }

    // Step 4: Build prompt
    const categoryContext = category ? ` (category: ${category})` : ''
    const prompt = `Given the merchant name '${merchant_name}'${categoryContext}, determine the most appropriate publicly traded stock ticker symbol. Return JSON: { "ticker": string, "company_name": string, "confidence": number (0-1), "reasoning": string }`

    // Step 7: Record start time
    const startTime = Date.now()

    // Step 5: Call DeepSeek API
    let rawResponse: string
    let parsedResponse: { ticker: string; company_name: string; confidence: number; reasoning: string }

    try {
      const aiRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst. Respond only with valid JSON, no markdown or extra text.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })

      if (!aiRes.ok) {
        const errBody = await aiRes.text()
        throw new Error(`DeepSeek API returned ${aiRes.status}: ${errBody}`)
      }

      const aiData = await aiRes.json()
      rawResponse = JSON.stringify(aiData)

      // Step 6: Parse the JSON response from the AI
      const content = aiData.choices?.[0]?.message?.content ?? ''
      // Strip potential markdown fences
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
      parsedResponse = JSON.parse(cleaned)
    } catch (aiError) {
      const endTime = Date.now()
      const processingTimeMs = endTime - startTime

      // Step 8: Record failed AI response
      await supabase.from('ai_responses').insert({
        merchant_name,
        category: category ?? null,
        prompt,
        raw_response: rawResponse ?? (aiError as Error).message,
        parsed_response: null,
        processing_time_ms: processingTimeMs,
        model_version: 'deepseek-chat',
        is_error: true,
      })

      return errorResponse(`AI mapping failed: ${(aiError as Error).message}`, 502)
    }

    // Step 7 (continued): Record end time
    const endTime = Date.now()
    const processingTimeMs = endTime - startTime

    // Step 8: Insert into ai_responses
    await supabase.from('ai_responses').insert({
      merchant_name,
      category: category ?? null,
      prompt,
      raw_response: rawResponse,
      parsed_response: JSON.stringify(parsedResponse),
      processing_time_ms: processingTimeMs,
      model_version: 'deepseek-chat',
      is_error: false,
    })

    // Step 9: Determine auto-approval status
    const { data: adminSettings } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'auto_approval_enabled')
      .maybeSingle()

    const autoApprovalEnabled = adminSettings?.setting_value === 'true'

    const autoApproved = parsedResponse.confidence >= 0.9 && autoApprovalEnabled
    const status = autoApproved ? 'approved' : 'pending'

    // Insert into llm_mappings
    const { data: mapping, error: mappingError } = await supabase
      .from('llm_mappings')
      .insert({
        merchant_name,
        ticker: parsedResponse.ticker,
        company_name: parsedResponse.company_name,
        category: category ?? null,
        confidence: parsedResponse.confidence,
        ai_processed: true,
        status,
        admin_approved: autoApproved,
        user_id: userRecord.id,
      })
      .select('id')
      .single()

    if (mappingError) {
      return errorResponse(`Failed to save mapping: ${mappingError.message}`, 500)
    }

    // Step 10: Deduct API cost from api_balance and log to api_usage
    const { data: balanceRecord } = await supabase
      .from('api_balance')
      .select('id, balance')
      .limit(1)
      .single()

    if (balanceRecord) {
      const cost = 0.002 // estimated cost per DeepSeek API call
      const newBalance = Math.max(0, balanceRecord.balance - cost)

      await supabase
        .from('api_balance')
        .update({ balance: newBalance })
        .eq('id', balanceRecord.id)

      await supabase.from('api_usage').insert({
        endpoint: 'ai-mapping',
        model: 'deepseek-chat',
        cost,
        request_data: merchant_name,
        user_id: userRecord.id,
        processing_time_ms: processingTimeMs,
        success: true,
      })
    }

    // Step 11: If transaction_id provided and mapping was auto-approved, update transaction
    if (transaction_id && autoApproved) {
      await supabase
        .from('transactions')
        .update({ ticker: parsedResponse.ticker })
        .eq('id', transaction_id)
    }

    // Step 12: Return result
    return jsonResponse({
      mapping_id: mapping.id,
      merchant_name,
      ticker: parsedResponse.ticker,
      company_name: parsedResponse.company_name,
      confidence: parsedResponse.confidence,
      status,
      auto_approved: autoApproved,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
