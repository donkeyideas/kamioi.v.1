import { supabase } from '@/lib/supabase'

type EdgeFunctionName =
  | 'process-roundup'
  | 'ai-mapping'
  | 'ai-recommendations'
  | 'subscription-manage'
  | 'blog-generate'
  | 'contact-submit'
  | 'seo-audit'
  | 'bulk-upload'
  | 'export-data'
  | 'stock-prices'
  | 'receipt-upload'
  | 'receipt-process'
  | 'receipt-confirm'
  | 'social-posts'
  | 'social-posts-generate'
  | 'social-posts-publish'
  | 'social-posts-automation'
  | 'social-posts-credentials'
  | 'social-posts-test-connection'

async function invokeEdge<T = Record<string, unknown>>(
  fn: EdgeFunctionName,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(fn, {
      body,
    })
    if (error) return { data: null, error: error.message ?? String(error) }
    return { data: data as T, error: null }
  } catch {
    // Edge function not deployed or CORS preflight failed — return graceful error
    return { data: null, error: `Edge function "${fn}" is not available. Deploy it with: supabase functions deploy ${fn}` }
  }
}

/* ------------------------------------------------------------------ */
/*  Round-up Processing                                                */
/* ------------------------------------------------------------------ */

export async function processRoundup(transactionId: number) {
  return invokeEdge('process-roundup', { transaction_id: transactionId })
}

/* ------------------------------------------------------------------ */
/*  AI Merchant-to-Ticker Mapping                                      */
/* ------------------------------------------------------------------ */

interface MappingResult {
  ticker: string
  company_name: string
  category: string
  confidence: number
}

export async function mapMerchant(merchantName: string, transactionId?: number) {
  return invokeEdge<MappingResult>('ai-mapping', {
    merchant_name: merchantName,
    transaction_id: transactionId,
  })
}

export async function bulkMapMerchants(merchants: string[]) {
  return invokeEdge('ai-mapping', {
    action: 'bulk',
    merchants,
  })
}

/* ------------------------------------------------------------------ */
/*  AI Recommendations                                                 */
/* ------------------------------------------------------------------ */

interface Recommendation {
  type: string
  title: string
  description: string
  confidence: number
}

export async function getAiRecommendations() {
  return invokeEdge<{ recommendations: Recommendation[] }>('ai-recommendations', {})
}

/* ------------------------------------------------------------------ */
/*  Subscription Management                                            */
/* ------------------------------------------------------------------ */

export async function subscribe(planId: number, billingCycle: 'monthly' | 'yearly', promoCode?: string) {
  return invokeEdge('subscription-manage', {
    action: 'subscribe',
    plan_id: planId,
    billing_cycle: billingCycle,
    promo_code: promoCode,
  })
}

export async function upgradeSubscription(newPlanId: number, billingCycle: 'monthly' | 'yearly') {
  return invokeEdge('subscription-manage', {
    action: 'upgrade',
    new_plan_id: newPlanId,
    billing_cycle: billingCycle,
  })
}

export async function downgradeSubscription(newPlanId: number) {
  return invokeEdge('subscription-manage', {
    action: 'downgrade',
    new_plan_id: newPlanId,
  })
}

export async function cancelSubscription(reason?: string) {
  return invokeEdge('subscription-manage', {
    action: 'cancel',
    reason,
  })
}

export async function renewSubscription(subscriptionId: number) {
  return invokeEdge('subscription-manage', {
    action: 'renew',
    subscription_id: subscriptionId,
  })
}

/* ------------------------------------------------------------------ */
/*  Blog Generation                                                    */
/* ------------------------------------------------------------------ */

interface GeneratedBlog {
  title: string
  slug: string
  content: string
  excerpt: string
  seo_title: string
  seo_description: string
  seo_keywords: string
  tags: string[]
  category: string
}

export async function generateBlogPost(topic: string, keywords?: string[], tone?: string) {
  return invokeEdge<GeneratedBlog>('blog-generate', {
    topic,
    keywords,
    tone,
  })
}

/* ------------------------------------------------------------------ */
/*  Contact Form                                                       */
/* ------------------------------------------------------------------ */

export async function submitContactForm(data: {
  name: string
  email: string
  subject?: string
  message: string
}) {
  return invokeEdge('contact-submit', data)
}

/* ------------------------------------------------------------------ */
/*  SEO Audit                                                          */
/* ------------------------------------------------------------------ */

interface SeoAuditResult {
  overall_score: number
  pages: Array<{
    url: string
    score: number
    issues: string[]
    suggestions: string[]
  }>
}

export async function runSeoAudit() {
  return invokeEdge<SeoAuditResult>('seo-audit', { action: 'full_audit' })
}

export async function auditSinglePage(url: string) {
  return invokeEdge('seo-audit', { action: 'page_audit', url })
}

/* ------------------------------------------------------------------ */
/*  Bulk Upload                                                        */
/* ------------------------------------------------------------------ */

export async function bulkUploadTransactions(csvContent: string, userId?: number) {
  return invokeEdge('bulk-upload', {
    csv_content: csvContent,
    user_id: userId,
  })
}

/* ------------------------------------------------------------------ */
/*  Data Export                                                        */
/* ------------------------------------------------------------------ */

export async function exportData(
  dataType: 'transactions' | 'portfolio' | 'goals',
  filters?: { start_date?: string; end_date?: string; status?: string },
  userId?: number,
) {
  return invokeEdge('export-data', {
    data_type: dataType,
    filters,
    user_id: userId,
  })
}

/* ------------------------------------------------------------------ */
/*  Stock Prices                                                       */
/* ------------------------------------------------------------------ */

interface StockPrice {
  ticker: string
  price: number
  change: number
  change_percent: number
  name: string
}

export async function getStockPrices(tickers: string[]) {
  return invokeEdge<{ prices: StockPrice[] }>('stock-prices', { tickers })
}

export async function getStockPrice(ticker: string) {
  return invokeEdge<StockPrice>('stock-prices', { tickers: [ticker] })
}

/* ------------------------------------------------------------------ */
/*  Smart Receipt Processing                                           */
/* ------------------------------------------------------------------ */

export interface ReceiptAllocation {
  stockSymbol: string
  stockName: string
  amount: number
  percentage: number
  reason: string
  confidence: number
}

export interface ReceiptParsedData {
  retailer: { name: string; stockSymbol: string | null }
  items: Array<{
    name: string
    brand: string | null
    amount: number
    brandSymbol: string | null
    brandConfidence: number
  }>
  totalAmount: number
  timestamp: string
}

interface ReceiptUploadResult {
  receipt_id: number
  filename: string
  storage_path: string
  file_type: string
  file_size_bytes: number
}

interface ReceiptProcessResult {
  receipt_id: number
  status: string
  parsed_data: ReceiptParsedData
  allocation_data: { allocations: ReceiptAllocation[]; totalRoundUp: number }
  ai_provider: string
  processing_time_ms: number
}

interface ReceiptConfirmResult {
  transaction_id: number
  receipt_id: number
  merchant: string
  amount: number
  round_up: number
  fee: number
  net_investment: number
  allocations: ReceiptAllocation[]
  status: string
}

/**
 * Upload a receipt image to Supabase Storage and create a receipt record.
 * Uses FormData instead of JSON since we're sending a file.
 */
export async function uploadReceipt(file: File): Promise<{ data: ReceiptUploadResult | null; error: string | null }> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { data: null, error: 'Not authenticated' }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    const res = await fetch(`${supabaseUrl}/functions/v1/receipt-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    })

    const result = await res.json()
    if (!res.ok) return { data: null, error: result.error || `Upload failed (${res.status})` }
    return { data: result as ReceiptUploadResult, error: null }
  } catch {
    return { data: null, error: 'Receipt upload failed. Check your connection.' }
  }
}

/** Trigger AI extraction & allocation on an uploaded receipt */
export async function processReceipt(receiptId: number) {
  return invokeEdge<ReceiptProcessResult>('receipt-process', { receipt_id: receiptId })
}

/** Confirm receipt → create transaction + allocations */
export async function confirmReceipt(
  receiptId: number,
  editedData?: { parsed_data: ReceiptParsedData; allocation_data: { allocations: ReceiptAllocation[]; totalRoundUp: number } },
  corrections?: Record<string, unknown>,
) {
  return invokeEdge<ReceiptConfirmResult>('receipt-confirm', {
    receipt_id: receiptId,
    edited_data: editedData,
    corrections,
  })
}

/* ------------------------------------------------------------------ */
/*  Social Media Posts                                                 */
/* ------------------------------------------------------------------ */

export type SocialPlatform = 'TWITTER' | 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK'
export type SocialPostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'CANCELLED'

export interface SocialPost {
  id: string
  platform: SocialPlatform
  content: string
  status: SocialPostStatus
  hashtags: string[]
  image_prompt: string | null
  scheduled_at: string | null
  published_at: string | null
  error_message: string | null
  platform_post_id: string | null
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface GeneratedSocialPost {
  platform: string
  content: string
  hashtags: string[]
  image_prompt: string | null
}

export async function listSocialPosts(filters?: { status?: string; platform?: string }) {
  return invokeEdge<{ data: SocialPost[]; count: number }>('social-posts', {
    method: 'list',
    ...filters,
  })
}

export async function createSocialPost(post: {
  platform: string
  content: string
  hashtags?: string[]
  image_prompt?: string
  status?: string
  scheduled_at?: string
}) {
  return invokeEdge<SocialPost>('social-posts', { method: 'create', ...post })
}

export async function updateSocialPost(id: string, updates: Record<string, unknown>) {
  return invokeEdge<SocialPost>('social-posts', { method: 'update', id, ...updates })
}

export async function deleteSocialPost(id: string) {
  return invokeEdge<{ deleted: boolean }>('social-posts', { method: 'delete', id })
}

export async function generateSocialPosts(topic: string, tone: string, platforms: string[]) {
  return invokeEdge<{ generated: GeneratedSocialPost[]; errors: Array<{ platform: string; error: string }>; cost: number }>(
    'social-posts-generate',
    { topic, tone, platforms },
  )
}

export async function publishSocialPost(postId: string) {
  return invokeEdge<{ success: boolean; platform_post_id?: string }>(
    'social-posts-publish',
    { post_id: postId },
  )
}

export async function getSocialAutomation() {
  return invokeEdge<Record<string, string>>('social-posts-automation', { method: 'get' })
}

export async function saveSocialAutomation(settings: Record<string, string>) {
  return invokeEdge<{ saved: boolean }>('social-posts-automation', { method: 'save', settings })
}

export async function getSocialCredentials() {
  return invokeEdge<Record<string, { masked: string; configured: boolean }>>('social-posts-credentials', { method: 'get' })
}

export async function saveSocialCredentials(credentials: Record<string, string>) {
  return invokeEdge<{ saved: boolean }>('social-posts-credentials', { method: 'save', credentials })
}

export async function testSocialConnection(platform: string) {
  return invokeEdge<{ connected: boolean; account_name?: string; error?: string }>(
    'social-posts-test-connection',
    { platform },
  )
}
