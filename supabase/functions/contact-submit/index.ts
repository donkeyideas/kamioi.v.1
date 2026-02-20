import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabase.ts'
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

    const serviceClient = createServiceClient()

    // 1. Parse and validate request body
    const body = await req.json()
    const { name, email, subject, message } = body as {
      name?: string
      email?: string
      subject?: string
      message?: string
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('name is required and must be a non-empty string')
    }

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return errorResponse('email is required and must be a non-empty string')
    }

    if (
      !subject ||
      typeof subject !== 'string' ||
      subject.trim().length === 0
    ) {
      return errorResponse(
        'subject is required and must be a non-empty string',
      )
    }

    if (
      !message ||
      typeof message !== 'string' ||
      message.trim().length === 0
    ) {
      return errorResponse(
        'message is required and must be a non-empty string',
      )
    }

    // Validate email format with a basic pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email.trim())) {
      return errorResponse('email must be a valid email address')
    }

    // 2. Rate limit: max 1 message per 5 minutes per email
    const fiveMinutesAgo = new Date(
      Date.now() - 5 * 60 * 1000,
    ).toISOString()

    const { data: recentMessages, error: rateLimitError } = await serviceClient
      .from('contact_messages')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .gte('created_at', fiveMinutesAgo)

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError.message)
      return errorResponse('Failed to process request', 500)
    }

    if (recentMessages && recentMessages.length > 0) {
      return errorResponse(
        'You have already submitted a message recently. Please wait 5 minutes before sending another.',
        429,
      )
    }

    // 3. Extract IP address and user-agent from request headers
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null

    const userAgent = req.headers.get('user-agent') ?? null

    // 4. Insert into contact_messages
    const { data: insertedMessage, error: insertError } = await serviceClient
      .from('contact_messages')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'unread',
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single()

    if (insertError || !insertedMessage) {
      console.error(
        'Failed to insert contact message:',
        insertError?.message ?? 'unknown error',
      )
      return errorResponse('Failed to submit your message', 500)
    }

    // 5. Create notification for all admin users
    const { data: adminUsers, error: adminFetchError } = await serviceClient
      .from('users')
      .select('id')
      .eq('account_type', 'admin')

    if (adminFetchError) {
      console.error(
        'Failed to fetch admin users for notification:',
        adminFetchError.message,
      )
      // Do not fail the request -- the message was already saved
    }

    if (adminUsers && adminUsers.length > 0) {
      const notifications = adminUsers.map(
        (admin: { id: number }) => ({
          user_id: admin.id,
          title: 'New Contact Message',
          message: `From ${name.trim()}: ${subject.trim()}`,
          type: 'info',
          read: false,
        }),
      )

      const { error: notifError } = await serviceClient
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.error(
          'Failed to create admin notifications:',
          notifError.message,
        )
        // Do not fail the request -- the message was already saved
      }
    }

    // 6. Return success
    return jsonResponse({
      success: true,
      message_id: insertedMessage.id,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Internal server error'
    return errorResponse(message, 500)
  }
})
