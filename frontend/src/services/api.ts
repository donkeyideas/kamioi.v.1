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
