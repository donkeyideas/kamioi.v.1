import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, getUserRecord } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

const FALLBACK_RECOMMENDATIONS = [
  {
    title: 'Build an Emergency Fund',
    description:
      'Aim to save 3-6 months of living expenses in a liquid, low-risk account before focusing on investments.',
    category: 'savings' as const,
    priority: 'high' as const,
    action: 'Set up automatic round-up transfers to your savings goal.',
  },
  {
    title: 'Diversify Your Portfolio',
    description:
      'Spread investments across multiple asset classes to reduce risk. Consider index funds for broad market exposure.',
    category: 'investment' as const,
    priority: 'medium' as const,
    action: 'Review your current holdings and identify concentration risks.',
  },
  {
    title: 'Track Your Spending Patterns',
    description:
      'Understanding where your money goes each month helps identify opportunities to invest more through round-ups.',
    category: 'spending' as const,
    priority: 'medium' as const,
    action: 'Review your transaction history and categorize recurring expenses.',
  },
  {
    title: 'Set a Clear Investment Goal',
    description:
      'Define a specific financial target with a timeline. Goals with deadlines are more likely to be achieved.',
    category: 'goal' as const,
    priority: 'high' as const,
    action: 'Create a new goal with a target amount and date.',
  },
  {
    title: 'Increase Round-Up Multiplier',
    description:
      'Small increases in your round-up multiplier compound significantly over time without a noticeable impact on daily spending.',
    category: 'savings' as const,
    priority: 'low' as const,
    action: 'Adjust your round-up settings to 2x or 3x.',
  },
]

interface Holding {
  symbol: string
  shares: number
  current_price: number
  asset_type?: string
}

interface Transaction {
  amount: number
  category?: string
  type: string
  created_at: string
}

interface Goal {
  name: string
  target_amount: number
  current_amount: number
  deadline?: string
  status: string
}

interface Recommendation {
  title: string
  description: string
  category: 'savings' | 'investment' | 'spending' | 'goal'
  priority: 'high' | 'medium' | 'low'
  action: string
}

function buildContextSummary(
  holdings: Holding[],
  transactions: Transaction[],
  goals: Goal[],
): string {
  // Portfolio summary
  const totalValue = holdings.reduce(
    (sum, h) => sum + h.shares * (h.current_price || 0),
    0,
  )
  const topHoldings = [...holdings]
    .sort((a, b) => b.shares * (b.current_price || 0) - a.shares * (a.current_price || 0))
    .slice(0, 5)
    .map((h) => `${h.symbol}: ${h.shares} shares @ $${(h.current_price || 0).toFixed(2)}`)

  // Spending categories from transactions
  const categoryTotals: Record<string, number> = {}
  for (const t of transactions) {
    const cat = t.category || 'uncategorized'
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount)
  }
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, total]) => `${cat}: $${total.toFixed(2)}`)

  // Goal progress
  const goalSummaries = goals.map((g) => {
    const progress =
      g.target_amount > 0
        ? ((g.current_amount / g.target_amount) * 100).toFixed(1)
        : '0'
    return `${g.name}: $${g.current_amount.toFixed(2)} / $${g.target_amount.toFixed(2)} (${progress}% complete)${g.deadline ? `, deadline: ${g.deadline}` : ''}`
  })

  const parts = [
    `Total portfolio value: $${totalValue.toFixed(2)}`,
    `Number of holdings: ${holdings.length}`,
    topHoldings.length > 0
      ? `Top holdings: ${topHoldings.join('; ')}`
      : 'No holdings yet.',
    `Recent transactions (last 30): ${transactions.length} total`,
    topCategories.length > 0
      ? `Top spending categories: ${topCategories.join('; ')}`
      : 'No transaction categories available.',
    `Active goals: ${goals.length}`,
    goalSummaries.length > 0
      ? `Goal progress: ${goalSummaries.join('; ')}`
      : 'No active goals set.',
  ]

  return parts.join('\n')
}

async function callDeepSeek(
  apiKey: string,
  context: string,
): Promise<Recommendation[]> {
  const prompt = `You are a financial advisor for a micro-investing platform. Analyze this user's data and provide 3-5 actionable investment recommendations. User data:\n${context}\n\nReturn JSON array: [{ "title": string, "description": string, "category": "savings" | "investment" | "spending" | "goal", "priority": "high" | "medium" | "low", "action": string }]`

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful financial advisor. Respond only with valid JSON. Do not include markdown formatting or code blocks.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`DeepSeek API error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content ?? ''

  // Strip potential markdown code fences
  const cleaned = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  const parsed = JSON.parse(cleaned)

  if (!Array.isArray(parsed)) {
    throw new Error('DeepSeek response is not an array')
  }

  // Validate and sanitize each recommendation
  const validCategories = ['savings', 'investment', 'spending', 'goal']
  const validPriorities = ['high', 'medium', 'low']

  return parsed.map((item: Record<string, unknown>) => ({
    title: String(item.title || 'Recommendation'),
    description: String(item.description || ''),
    category: validCategories.includes(item.category as string)
      ? (item.category as Recommendation['category'])
      : 'investment',
    priority: validPriorities.includes(item.priority as string)
      ? (item.priority as Recommendation['priority'])
      : 'medium',
    action: String(item.action || ''),
  }))
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // 1. Authenticate user
    const { user } = await getAuthUser(req)
    const serviceClient = createServiceClient()
    const userRecord = await getUserRecord(serviceClient, user.id)
    const userId = userRecord.id

    // 2. Fetch portfolio holdings
    const { data: holdings, error: holdingsErr } = await serviceClient
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)

    if (holdingsErr) {
      console.error('Error fetching portfolios:', holdingsErr.message)
    }

    // 3. Fetch recent transactions (last 30)
    const { data: transactions, error: txErr } = await serviceClient
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (txErr) {
      console.error('Error fetching transactions:', txErr.message)
    }

    // 4. Fetch active goals
    const { data: goals, error: goalsErr } = await serviceClient
      .from('goals')
      .select('*')
      .eq('user_id', userId)

    if (goalsErr) {
      console.error('Error fetching goals:', goalsErr.message)
    }

    // 5. Build context summary
    const context = buildContextSummary(
      (holdings || []) as Holding[],
      (transactions || []) as Transaction[],
      (goals || []) as Goal[],
    )

    // 6. Check for DeepSeek API key
    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY')

    let recommendations: Recommendation[]
    let usedFallback = false

    if (!deepseekKey) {
      // Return fallback recommendations without failing
      console.warn('DEEPSEEK_API_KEY not set -- returning fallback recommendations.')
      recommendations = FALLBACK_RECOMMENDATIONS
      usedFallback = true
    } else {
      try {
        // 7-8. Call DeepSeek API and parse response
        recommendations = await callDeepSeek(deepseekKey, context)
      } catch (aiError) {
        console.error('DeepSeek API call failed:', (aiError as Error).message)
        recommendations = FALLBACK_RECOMMENDATIONS
        usedFallback = true
      }
    }

    // 9. Log usage and deduct balance (only when AI was actually called)
    if (!usedFallback) {
      try {
        await serviceClient.from('api_usage').insert({
          user_id: userId,
          endpoint: 'ai-recommendations',
          total_tokens: 1,
          cost: 0.002,
          model: 'deepseek-chat',
          success: true,
        })

        // Deduct from api_balance (singleton table, no user_id filter)
        const { data: balanceRecord } = await serviceClient
          .from('api_balance')
          .select('id, balance')
          .limit(1)
          .single()

        if (balanceRecord && balanceRecord.balance > 0) {
          await serviceClient
            .from('api_balance')
            .update({ balance: balanceRecord.balance - 0.002 })
            .eq('id', balanceRecord.id)
        }
      } catch (logError) {
        // Non-fatal: log but do not block the response
        console.error('Failed to log API usage:', (logError as Error).message)
      }
    }

    // 10. Return recommendations
    return jsonResponse({
      recommendations,
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    const message = (err as Error).message || 'Internal server error'

    if (message === 'Unauthorized' || message === 'Missing authorization header') {
      return errorResponse(message, 401)
    }
    if (message === 'User not found') {
      return errorResponse(message, 404)
    }

    console.error('ai-recommendations error:', message)
    return errorResponse(message, 500)
  }
})
