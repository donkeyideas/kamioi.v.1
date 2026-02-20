import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

type Action = 'subscribe' | 'upgrade' | 'downgrade' | 'cancel' | 'renew'
type BillingCycle = 'monthly' | 'yearly'

interface RequestBody {
  action: Action
  plan_id?: number
  promo_code?: string
  billing_cycle?: BillingCycle
}

function addPeriod(date: Date, cycle: BillingCycle): Date {
  const d = new Date(date)
  if (cycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Authenticate user
    const { user } = await getAuthUser(req)
    const serviceClient = createServiceClient()
    const userRecord = await getUserRecord(serviceClient, user.id)

    // 2. Parse and validate request body
    const body: RequestBody = await req.json()
    const { action, plan_id, promo_code, billing_cycle = 'monthly' } = body

    const validActions: Action[] = ['subscribe', 'upgrade', 'downgrade', 'cancel', 'renew']
    if (!action || !validActions.includes(action)) {
      return errorResponse(
        'Invalid action. Must be one of: subscribe, upgrade, downgrade, cancel, renew',
      )
    }

    if (['subscribe', 'upgrade', 'downgrade'].includes(action) && !plan_id) {
      return errorResponse('plan_id is required for this action')
    }

    // ---------------------------------------------------------------
    // SUBSCRIBE
    // ---------------------------------------------------------------
    if (action === 'subscribe') {
      // Verify user does not already have an active subscription
      const { data: existing } = await serviceClient
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userRecord.id)
        .eq('status', 'active')
        .maybeSingle()

      if (existing) {
        return errorResponse('User already has an active subscription. Use upgrade or downgrade instead.')
      }

      // Fetch requested plan
      const { data: plan, error: planError } = await serviceClient
        .from('subscription_plans')
        .select('*')
        .eq('id', plan_id)
        .single()

      if (planError || !plan) {
        return errorResponse('Subscription plan not found', 404)
      }

      // Determine base amount based on billing cycle
      let amount: number = billing_cycle === 'yearly'
        ? (plan.price_yearly ?? plan.price_monthly * 12)
        : plan.price_monthly

      // Validate and apply promo code if provided
      let promoRecord: Record<string, unknown> | null = null

      if (promo_code) {
        const { data: promo, error: promoError } = await serviceClient
          .from('promo_codes')
          .select('*')
          .eq('code', promo_code)
          .eq('is_active', true)
          .single()

        if (promoError || !promo) {
          return errorResponse('Invalid or inactive promo code')
        }

        // Check expiration
        if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
          return errorResponse('Promo code has expired')
        }

        // Check usage limits
        if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
          return errorResponse('Promo code has reached its maximum number of uses')
        }

        promoRecord = promo

        // Apply discount
        if (promo.discount_type === 'percentage') {
          amount = parseFloat((amount * (1 - promo.discount_value / 100)).toFixed(2))
        } else if (promo.discount_type === 'fixed') {
          amount = parseFloat(Math.max(0, amount - promo.discount_value).toFixed(2))
        }
      }

      // Build subscription record
      const now = new Date()
      const periodEnd = addPeriod(now, billing_cycle)

      const { data: subscription, error: subError } = await serviceClient
        .from('user_subscriptions')
        .insert({
          user_id: userRecord.id,
          plan_id: plan.id,
          status: 'active',
          billing_cycle,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          amount,
        })
        .select('*')
        .single()

      if (subError || !subscription) {
        return errorResponse(
          `Failed to create subscription: ${subError?.message ?? 'unknown error'}`,
          500,
        )
      }

      // Update user record
      const { error: userUpdateError } = await serviceClient
        .from('users')
        .update({
          subscription_tier: plan.tier,
          subscription_status: 'active',
        })
        .eq('id', userRecord.id)

      if (userUpdateError) {
        return errorResponse(
          `Failed to update user record: ${userUpdateError.message}`,
          500,
        )
      }

      // Handle promo code bookkeeping
      if (promoRecord) {
        await serviceClient
          .from('promo_codes')
          .update({ current_uses: (promoRecord.current_uses as number) + 1 })
          .eq('id', promoRecord.id)

        await serviceClient
          .from('promo_code_usage')
          .insert({
            promo_code_id: promoRecord.id,
            user_id: userRecord.id,
            subscription_id: subscription.id,
          })
      }

      // Record the change
      await serviceClient
        .from('subscription_changes')
        .insert({
          user_id: userRecord.id,
          change_type: 'new_subscription',
          to_plan_id: plan.id,
        })

      return jsonResponse({
        success: true,
        subscription,
        change_type: 'new_subscription',
      })
    }

    // ---------------------------------------------------------------
    // UPGRADE / DOWNGRADE
    // ---------------------------------------------------------------
    if (action === 'upgrade' || action === 'downgrade') {
      // Fetch current active subscription
      const { data: current, error: currentError } = await serviceClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userRecord.id)
        .eq('status', 'active')
        .single()

      if (currentError || !current) {
        return errorResponse('No active subscription found', 404)
      }

      if (current.plan_id === plan_id) {
        return errorResponse('New plan must be different from the current plan')
      }

      // Fetch the new plan
      const { data: newPlan, error: planError } = await serviceClient
        .from('subscription_plans')
        .select('*')
        .eq('id', plan_id)
        .single()

      if (planError || !newPlan) {
        return errorResponse('Subscription plan not found', 404)
      }

      const newAmount: number = (current.billing_cycle === 'yearly')
        ? (newPlan.price_yearly ?? newPlan.price_monthly * 12)
        : newPlan.price_monthly

      // Update subscription
      const { data: updated, error: updateError } = await serviceClient
        .from('user_subscriptions')
        .update({
          plan_id: newPlan.id,
          amount: newAmount,
        })
        .eq('id', current.id)
        .select('*')
        .single()

      if (updateError || !updated) {
        return errorResponse(
          `Failed to update subscription: ${updateError?.message ?? 'unknown error'}`,
          500,
        )
      }

      // Record the change
      await serviceClient
        .from('subscription_changes')
        .insert({
          user_id: userRecord.id,
          change_type: action,
          from_plan_id: current.plan_id,
          to_plan_id: newPlan.id,
        })

      // Update user tier
      const { error: userUpdateError } = await serviceClient
        .from('users')
        .update({ subscription_tier: newPlan.tier })
        .eq('id', userRecord.id)

      if (userUpdateError) {
        return errorResponse(
          `Failed to update user record: ${userUpdateError.message}`,
          500,
        )
      }

      return jsonResponse({
        success: true,
        subscription: updated,
        change_type: action,
      })
    }

    // ---------------------------------------------------------------
    // CANCEL
    // ---------------------------------------------------------------
    if (action === 'cancel') {
      // Fetch current active subscription
      const { data: current, error: currentError } = await serviceClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userRecord.id)
        .eq('status', 'active')
        .single()

      if (currentError || !current) {
        return errorResponse('No active subscription found', 404)
      }

      const now = new Date()

      // Update subscription status
      const { data: cancelled, error: cancelError } = await serviceClient
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancellation_requested_at: now.toISOString(),
        })
        .eq('id', current.id)
        .select('*')
        .single()

      if (cancelError || !cancelled) {
        return errorResponse(
          `Failed to cancel subscription: ${cancelError?.message ?? 'unknown error'}`,
          500,
        )
      }

      // Record the change
      await serviceClient
        .from('subscription_changes')
        .insert({
          user_id: userRecord.id,
          change_type: 'cancellation',
          from_plan_id: current.plan_id,
        })

      // Update user record
      const { error: userUpdateError } = await serviceClient
        .from('users')
        .update({ subscription_status: 'cancelled' })
        .eq('id', userRecord.id)

      if (userUpdateError) {
        return errorResponse(
          `Failed to update user record: ${userUpdateError.message}`,
          500,
        )
      }

      return jsonResponse({
        success: true,
        subscription: cancelled,
        change_type: 'cancellation',
      })
    }

    // ---------------------------------------------------------------
    // RENEW
    // ---------------------------------------------------------------
    if (action === 'renew') {
      // Fetch current subscription (may be active or expired)
      const { data: current, error: currentError } = await serviceClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userRecord.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (currentError || !current) {
        return errorResponse('No subscription found', 404)
      }

      const now = new Date()
      const cycle: BillingCycle = current.billing_cycle ?? 'monthly'
      const newPeriodEnd = addPeriod(now, cycle)

      // Update subscription period and reset renewal attempts
      const { data: renewed, error: renewError } = await serviceClient
        .from('user_subscriptions')
        .update({
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          next_billing_date: newPeriodEnd.toISOString(),
          renewal_attempts: 0,
        })
        .eq('id', current.id)
        .select('*')
        .single()

      if (renewError || !renewed) {
        return errorResponse(
          `Failed to renew subscription: ${renewError?.message ?? 'unknown error'}`,
          500,
        )
      }

      // Insert renewal history record
      await serviceClient
        .from('renewal_history')
        .insert({
          subscription_id: current.id,
          renewal_date: now.toISOString(),
          amount: current.amount,
          status: 'completed',
        })

      // Ensure user status reflects active subscription
      await serviceClient
        .from('users')
        .update({ subscription_status: 'active' })
        .eq('id', userRecord.id)

      return jsonResponse({
        success: true,
        subscription: renewed,
        change_type: 'renewal',
      })
    }

    // Should never reach here, but just in case
    return errorResponse('Unhandled action', 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401 : 500
    return errorResponse(message, status)
  }
})
