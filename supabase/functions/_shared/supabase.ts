import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

export function createUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing authorization header')

  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
    },
  )
}

export async function getAuthUser(req: Request) {
  const client = createUserClient(req)
  const {
    data: { user },
    error,
  } = await client.auth.getUser()
  if (error || !user) throw new Error('Unauthorized')
  return { user, client }
}

export async function getUserRecord(
  serviceClient: ReturnType<typeof createServiceClient>,
  authId: string,
) {
  const { data, error } = await serviceClient
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .single()
  if (error || !data) throw new Error('User not found')
  return data
}

export async function requireAdmin(
  serviceClient: ReturnType<typeof createServiceClient>,
  authId: string,
) {
  const user = await getUserRecord(serviceClient, authId)
  if (user.account_type !== 'admin') throw new Error('Forbidden: admin only')
  return user
}
