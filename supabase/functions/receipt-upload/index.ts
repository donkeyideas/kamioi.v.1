import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf']

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Auth
    const { user } = await getAuthUser(req)
    const supabase = createServiceClient()
    const userRecord = await getUserRecord(supabase, user.id)

    // 2. Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return errorResponse('No file provided. Send a "file" field in multipart form data.')
    }

    // 3. Validate file type
    const fileType = file.type || ''
    if (!ALLOWED_TYPES.includes(fileType)) {
      return errorResponse(
        `Invalid file type "${fileType}". Allowed: PNG, JPG, JPEG, PDF`,
      )
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`,
      )
    }

    // 5. Create receipt record first to get the ID
    const ext = fileType === 'application/pdf'
      ? 'pdf'
      : fileType === 'image/png'
        ? 'png'
        : 'jpg'

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        user_id: userRecord.id,
        filename: file.name,
        storage_path: '', // placeholder, updated after upload
        file_type: fileType,
        file_size_bytes: file.size,
        status: 'uploaded',
      })
      .select('id')
      .single()

    if (receiptError || !receipt) {
      return errorResponse(
        `Failed to create receipt record: ${receiptError?.message ?? 'unknown'}`,
        500,
      )
    }

    // 6. Upload to Supabase Storage
    const storagePath = `${userRecord.id}/${receipt.id}.${ext}`
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, fileBuffer, {
        contentType: fileType,
        upsert: false,
      })

    if (uploadError) {
      // Clean up the receipt record on upload failure
      await supabase.from('receipts').delete().eq('id', receipt.id)
      return errorResponse(
        `Storage upload failed: ${uploadError.message}`,
        500,
      )
    }

    // 7. Update receipt with actual storage path
    await supabase
      .from('receipts')
      .update({ storage_path: storagePath })
      .eq('id', receipt.id)

    return jsonResponse({
      receipt_id: receipt.id,
      filename: file.name,
      storage_path: storagePath,
      file_type: fileType,
      file_size_bytes: file.size,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status = message === 'Unauthorized' ? 401
      : message === 'User not found' ? 404
      : 500
    return errorResponse(message, status)
  }
})
