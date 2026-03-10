const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export async function validateDemoCode(code: string, email: string) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/demo-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'validate', code, email }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => null)
      return { data: null, error: errBody?.error || `Error (${res.status})` }
    }

    const data = await res.json()
    return { data: data as { session_token: string; email: string; valid_until: string }, error: null }
  } catch {
    return { data: null, error: 'Demo access is not available.' }
  }
}

export async function logDemoVisit(sessionToken: string, email: string, demoType: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/demo-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'log_visit',
        session_token: sessionToken,
        email,
        demo_type: demoType,
      }),
    })
  } catch {
    // Silently fail — logging is best-effort
  }
}
