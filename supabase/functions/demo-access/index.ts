import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    const serviceClient = createServiceClient()
    const body = await req.json()
    const { action } = body as { action?: string }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null
    const userAgent = req.headers.get('user-agent') ?? null

    /* ---- Validate demo code ---- */
    if (action === 'validate') {
      const { code, email } = body as { code?: string; email?: string }

      if (!code || typeof code !== 'string' || code.trim().length === 0) {
        return errorResponse('Demo code is required')
      }
      if (!email || typeof email !== 'string' || email.trim().length === 0) {
        return errorResponse('Email is required')
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(email.trim())) {
        return errorResponse('Please enter a valid email address')
      }

      const trimmedEmail = email.trim().toLowerCase()
      const trimmedCode = code.trim().toUpperCase()

      // Rate limit: max 5 failed attempts per email per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { data: recentAttempts } = await serviceClient
        .from('demo_access_log')
        .select('id')
        .eq('email', trimmedEmail)
        .eq('access_type', 'failed_attempt')
        .gte('created_at', oneHourAgo)

      if (recentAttempts && recentAttempts.length >= 5) {
        return errorResponse(
          'Too many failed attempts. Please try again later.',
          429,
        )
      }

      // Look up promo code
      const { data: promoCode, error: promoErr } = await serviceClient
        .from('promo_codes')
        .select('*')
        .ilike('code', trimmedCode)
        .maybeSingle()

      if (promoErr || !promoCode) {
        // Log failed attempt
        await serviceClient.from('demo_access_log').insert({
          email: trimmedEmail,
          demo_code: trimmedCode,
          access_type: 'failed_attempt',
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        return errorResponse('Invalid demo code', 400)
      }

      // Check active
      if (!promoCode.is_active) {
        await serviceClient.from('demo_access_log').insert({
          email: trimmedEmail,
          demo_code: trimmedCode,
          access_type: 'failed_attempt',
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        return errorResponse('This demo code is no longer active', 400)
      }

      // Check expiry
      if (promoCode.valid_until && new Date(promoCode.valid_until) < new Date()) {
        return errorResponse('This demo code has expired', 400)
      }

      // Check max uses
      if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
        return errorResponse('This demo code has reached its usage limit', 400)
      }

      // Generate session token
      const sessionToken = crypto.randomUUID()

      // Increment usage atomically
      await serviceClient
        .from('promo_codes')
        .update({ current_uses: (promoCode.current_uses || 0) + 1 })
        .eq('id', promoCode.id)

      // Log successful access
      await serviceClient.from('demo_access_log').insert({
        promo_code_id: promoCode.id,
        email: trimmedEmail,
        demo_code: trimmedCode,
        access_type: 'code_entry',
        ip_address: ipAddress,
        user_agent: userAgent,
        session_token: sessionToken,
      })

      return jsonResponse({
        session_token: sessionToken,
        email: trimmedEmail,
        valid_until: promoCode.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    /* ---- Log return visit ---- */
    if (action === 'log_visit') {
      const { session_token, email, demo_type } = body as {
        session_token?: string
        email?: string
        demo_type?: string
      }

      if (!session_token || !email) {
        return errorResponse('session_token and email are required')
      }

      await serviceClient.from('demo_access_log').insert({
        email: email.trim().toLowerCase(),
        demo_code: 'return',
        demo_type: demo_type || null,
        access_type: 'return_visit',
        ip_address: ipAddress,
        user_agent: userAgent,
        session_token,
      })

      return jsonResponse({ logged: true })
    }

    return errorResponse('Invalid action. Use "validate" or "log_visit".')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
