/**
 * Teller API client utility.
 * Uses access token + optional mTLS certificate auth.
 * Sandbox mode: no certificate needed, just access token.
 * Production mode: requires TELLER_CERT + TELLER_KEY secrets.
 */

const TELLER_API_BASE = 'https://api.teller.io'

export async function tellerFetch(
  path: string,
  accessToken: string,
  options?: RequestInit,
): Promise<Response> {
  const auth = btoa(`${accessToken}:`)

  // Check if we have certificates for mTLS (production/development)
  const cert = Deno.env.get('TELLER_CERT')
  const key = Deno.env.get('TELLER_KEY')

  const fetchOptions: RequestInit & { client?: unknown } = {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  }

  // Use mTLS if certificates are available
  if (cert && key) {
    const client = Deno.createHttpClient({
      certChain: cert,
      privateKey: key,
    })
    fetchOptions.client = client
  }

  return fetch(`${TELLER_API_BASE}${path}`, fetchOptions)
}

export async function tellerGet(path: string, accessToken: string) {
  const res = await tellerFetch(path, accessToken, { method: 'GET' })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Teller API GET ${path} failed (${res.status}): ${body}`)
  }
  return res.json()
}

export async function tellerDelete(path: string, accessToken: string) {
  const res = await tellerFetch(path, accessToken, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) {
    const body = await res.text()
    throw new Error(`Teller API DELETE ${path} failed (${res.status}): ${body}`)
  }
  return res.status === 204 ? null : res.json()
}
