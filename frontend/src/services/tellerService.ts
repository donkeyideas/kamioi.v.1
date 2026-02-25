/**
 * Teller Bank Integration frontend service.
 * All calls go through authenticated Supabase Edge Functions.
 */

import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TellerEnrollment {
  id: number
  user_id: number
  enrollment_id: string
  institution_name: string | null
  institution_id: string | null
  is_active: boolean
  last_synced_at: string | null
  created_at: string
  teller_accounts?: TellerAccount[]
}

export interface TellerAccount {
  id: number
  enrollment_id: number
  user_id: number
  teller_account_id: string
  account_name: string | null
  account_type: string | null
  account_subtype: string | null
  balance_available: number | null
  balance_ledger: number | null
  institution_name: string | null
  last_four: string | null
  is_active: boolean
}

export interface SyncResult {
  synced: number
  mapped: number
  failed: number
  enrollments_synced: number
}

/* ------------------------------------------------------------------ */
/*  Edge Function helpers                                              */
/* ------------------------------------------------------------------ */

async function getAccessToken(): Promise<string> {
  // Try getting the current session
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token

  // Session not ready — wait for auth state change (up to 5s)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      reject(new Error('Auth session not available'))
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        clearTimeout(timeout)
        subscription.unsubscribe()
        resolve(session.access_token)
      }
    })
  })
}

async function invokeFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken()

  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (error) {
    throw new Error(error.message || `Edge Function ${name} failed`)
  }

  return data as T
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Save a Teller enrollment after Teller Connect completes */
export async function saveEnrollment(
  accessToken: string,
  enrollmentId: string,
  institution?: { name?: string; id?: string },
): Promise<{ success: boolean; enrollment_id: string }> {
  return invokeFunction('teller-save-enrollment', {
    access_token: accessToken,
    enrollment_id: enrollmentId,
    institution,
  })
}

/** Sync transactions from all linked banks (or a specific enrollment) */
export async function syncTransactions(enrollmentId?: string): Promise<SyncResult> {
  return invokeFunction('teller-sync-transactions', enrollmentId ? { enrollment_id: enrollmentId } : undefined)
}

/** List all linked bank enrollments + accounts */
export async function listLinkedAccounts(): Promise<{
  enrollments: TellerEnrollment[]
  accounts: TellerAccount[]
}> {
  return invokeFunction('teller-list-accounts')
}

/** Disconnect a linked bank enrollment */
export async function disconnectAccount(enrollmentId: string): Promise<{ success: boolean }> {
  return invokeFunction('teller-disconnect', { enrollment_id: enrollmentId })
}
