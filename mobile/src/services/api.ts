import { supabase } from '@/lib/supabase'

export async function invokeEdge<T = unknown>(functionName: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body })
  if (error) throw error
  return data as T
}

export async function uploadReceipt(
  imageUri: string,
  fileName: string,
  userId: number,
  aiProvider?: string,
  apiKey?: string
): Promise<unknown> {
  // React Native FormData uses { uri, name, type } instead of File objects
  const formData = new FormData()
  formData.append('file', {
    uri: imageUri,
    name: fileName,
    type: 'image/jpeg',
  } as any)
  formData.append('user_id', String(userId))
  if (aiProvider) formData.append('ai_provider', aiProvider)
  if (apiKey) formData.append('api_key', apiKey)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/receipt-upload`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || 'Upload failed')
  }

  return response.json()
}
