const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:4604'

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

export function corsResponse() {
  return new Response('ok', { headers: corsHeaders })
}
