/* ------------------------------------------------------------------ */
/*  Demo Data — mirrors frontend/src/demo/demoData.ts exactly          */
/*  Completely static, never touches the real system                   */
/* ------------------------------------------------------------------ */

export type ReceiptSubItem = {
  name: string
  brand: string | null
  amount: number
  ticker: string
  stockName: string
}

export type DemoTransaction = {
  id: number
  merchant: string
  category: string
  amount: number
  round_up: number
  fee: number
  ticker: string
  shares: number
  status: 'completed' | 'pending' | 'mapped'
  date: string
  created_at: string
  memberName?: string  // family + business
  subItems?: ReceiptSubItem[]
}

export type DemoHolding = {
  id: number
  ticker: string
  companyName: string
  domain: string
  shares: number
  avg_price: number
  current_price: number
  total_value: number
  day_change: number
  day_change_pct: number
}

export type DemoGoal = {
  id: number
  name: string
  target_amount: number
  current_amount: number
  deadline: string
  status: 'active' | 'completed'
}

export type DemoRecommendation = {
  type: string
  title: string
  description: string
  confidence: number
}

/* ---- Date helpers ---- */

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function monthsAgo(n: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().split('T')[0]
}

/* ---- Seeded PRNG for deterministic data (same as web) ---- */

function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return s / 0x7fffffff
  }
}

/* ---- Merchant pools (same as web) ---- */

type MerchantEntry = {
  merchant: string
  category: string
  ticker: string
  minAmt: number
  maxAmt: number
}

const MERCHANT_DOMAINS: Record<string, string> = {
  'Starbucks': 'starbucks.com', 'Dunkin': 'dunkindonuts.com',
  'Amazon': 'amazon.com', 'Walmart': 'walmart.com', 'Target': 'target.com',
  'Costco': 'costco.com', 'Whole Foods': 'wholefoodsmarket.com',
  "Trader Joe's": 'traderjoes.com', 'Chipotle': 'chipotle.com',
  "McDonald's": 'mcdonalds.com', "Chick-fil-A": 'chick-fil-a.com',
  'Panera Bread': 'panerabread.com', 'Uber': 'uber.com', 'Lyft': 'lyft.com',
  'Shell': 'shell.com', 'Chevron': 'chevron.com',
  'Netflix': 'netflix.com', 'Spotify': 'spotify.com', 'Apple': 'apple.com',
  'Best Buy': 'bestbuy.com', 'Home Depot': 'homedepot.com',
  "Lowe's": 'lowes.com', 'CVS': 'cvs.com', 'Walgreens': 'walgreens.com',
  'Nike': 'nike.com', 'Disney+': 'disney.com', 'Publix': 'publix.com',
  "Sam's Club": 'samsclub.com', 'BP': 'bp.com', 'Pizza Hut': 'pizzahut.com',
  'Amazon Web Services': 'aws.amazon.com', 'Google Cloud': 'google.com',
  'Microsoft 365': 'microsoft.com', 'Slack': 'slack.com', 'Zoom': 'zoom.us',
  'Adobe': 'adobe.com', 'Salesforce': 'salesforce.com', 'LinkedIn': 'linkedin.com',
  'GitHub': 'github.com', 'Delta Airlines': 'delta.com',
  'American Airlines': 'aa.com', 'United Airlines': 'united.com',
  'Hilton': 'hilton.com', 'Marriott': 'marriott.com',
  'Uber Eats': 'ubereats.com', 'FedEx': 'fedex.com', 'UPS': 'ups.com',
  'Subway': 'subway.com', 'WeWork': 'wework.com',
}

export function getMerchantDomain(merchant: string): string {
  return MERCHANT_DOMAINS[merchant] ?? merchant.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
}

const individualMerchants: MerchantEntry[] = [
  { merchant: 'Starbucks', category: 'Coffee', ticker: 'SBUX', minAmt: 4, maxAmt: 9 },
  { merchant: 'Dunkin', category: 'Coffee', ticker: 'DNKN', minAmt: 3, maxAmt: 8 },
  { merchant: 'Amazon', category: 'Shopping', ticker: 'AMZN', minAmt: 12, maxAmt: 180 },
  { merchant: 'Walmart', category: 'Groceries', ticker: 'WMT', minAmt: 25, maxAmt: 175 },
  { merchant: 'Target', category: 'Shopping', ticker: 'TGT', minAmt: 15, maxAmt: 120 },
  { merchant: 'Costco', category: 'Groceries', ticker: 'COST', minAmt: 60, maxAmt: 280 },
  { merchant: 'Whole Foods', category: 'Groceries', ticker: 'AMZN', minAmt: 30, maxAmt: 140 },
  { merchant: "Trader Joe's", category: 'Groceries', ticker: '', minAmt: 20, maxAmt: 95 },
  { merchant: 'Chipotle', category: 'Dining', ticker: 'CMG', minAmt: 9, maxAmt: 18 },
  { merchant: "McDonald's", category: 'Dining', ticker: 'MCD', minAmt: 6, maxAmt: 14 },
  { merchant: "Chick-fil-A", category: 'Dining', ticker: '', minAmt: 7, maxAmt: 16 },
  { merchant: 'Panera Bread', category: 'Dining', ticker: 'PNRA', minAmt: 8, maxAmt: 15 },
  { merchant: 'Uber', category: 'Transportation', ticker: 'UBER', minAmt: 8, maxAmt: 35 },
  { merchant: 'Lyft', category: 'Transportation', ticker: 'LYFT', minAmt: 7, maxAmt: 30 },
  { merchant: 'Shell', category: 'Gas', ticker: 'SHEL', minAmt: 30, maxAmt: 65 },
  { merchant: 'Chevron', category: 'Gas', ticker: 'CVX', minAmt: 28, maxAmt: 60 },
  { merchant: 'Netflix', category: 'Entertainment', ticker: 'NFLX', minAmt: 15, maxAmt: 23 },
  { merchant: 'Spotify', category: 'Entertainment', ticker: 'SPOT', minAmt: 10, maxAmt: 16 },
  { merchant: 'Apple', category: 'Technology', ticker: 'AAPL', minAmt: 1, maxAmt: 15 },
  { merchant: 'Best Buy', category: 'Technology', ticker: 'BBY', minAmt: 20, maxAmt: 350 },
  { merchant: 'Home Depot', category: 'Home', ticker: 'HD', minAmt: 15, maxAmt: 200 },
  { merchant: "Lowe's", category: 'Home', ticker: 'LOW', minAmt: 20, maxAmt: 180 },
  { merchant: 'CVS', category: 'Health', ticker: 'CVS', minAmt: 8, maxAmt: 45 },
  { merchant: 'Walgreens', category: 'Health', ticker: 'WBA', minAmt: 6, maxAmt: 40 },
  { merchant: 'Nike', category: 'Shopping', ticker: 'NKE', minAmt: 35, maxAmt: 180 },
]

const familyMerchants: MerchantEntry[] = [
  { merchant: 'Costco', category: 'Groceries', ticker: 'COST', minAmt: 80, maxAmt: 320 },
  { merchant: 'Walmart', category: 'Groceries', ticker: 'WMT', minAmt: 40, maxAmt: 200 },
  { merchant: 'Target', category: 'Shopping', ticker: 'TGT', minAmt: 20, maxAmt: 150 },
  { merchant: 'Amazon', category: 'Shopping', ticker: 'AMZN', minAmt: 15, maxAmt: 200 },
  { merchant: 'Whole Foods', category: 'Groceries', ticker: 'AMZN', minAmt: 40, maxAmt: 180 },
  { merchant: 'Disney+', category: 'Entertainment', ticker: 'DIS', minAmt: 14, maxAmt: 14 },
  { merchant: 'Netflix', category: 'Entertainment', ticker: 'NFLX', minAmt: 16, maxAmt: 23 },
  { merchant: 'Starbucks', category: 'Coffee', ticker: 'SBUX', minAmt: 5, maxAmt: 12 },
  { merchant: "Chick-fil-A", category: 'Dining', ticker: '', minAmt: 15, maxAmt: 40 },
  { merchant: 'Chipotle', category: 'Dining', ticker: 'CMG', minAmt: 20, maxAmt: 45 },
  { merchant: 'Shell', category: 'Gas', ticker: 'SHEL', minAmt: 35, maxAmt: 70 },
  { merchant: 'Home Depot', category: 'Home', ticker: 'HD', minAmt: 25, maxAmt: 250 },
  { merchant: 'Uber', category: 'Transportation', ticker: 'UBER', minAmt: 10, maxAmt: 40 },
  { merchant: 'CVS', category: 'Health', ticker: 'CVS', minAmt: 10, maxAmt: 50 },
  { merchant: 'Nike', category: 'Shopping', ticker: 'NKE', minAmt: 40, maxAmt: 200 },
  { merchant: 'Apple', category: 'Technology', ticker: 'AAPL', minAmt: 1, maxAmt: 15 },
  { merchant: "McDonald's", category: 'Dining', ticker: 'MCD', minAmt: 12, maxAmt: 30 },
  { merchant: 'Pizza Hut', category: 'Dining', ticker: 'YUM', minAmt: 15, maxAmt: 35 },
]

const businessMerchants: MerchantEntry[] = [
  { merchant: 'Amazon Web Services', category: 'SaaS', ticker: 'AMZN', minAmt: 150, maxAmt: 800 },
  { merchant: 'Google Cloud', category: 'SaaS', ticker: 'GOOGL', minAmt: 100, maxAmt: 500 },
  { merchant: 'Microsoft 365', category: 'SaaS', ticker: 'MSFT', minAmt: 22, maxAmt: 22 },
  { merchant: 'Slack', category: 'SaaS', ticker: 'CRM', minAmt: 12, maxAmt: 13 },
  { merchant: 'Zoom', category: 'SaaS', ticker: 'ZM', minAmt: 15, maxAmt: 15 },
  { merchant: 'Adobe', category: 'SaaS', ticker: 'ADBE', minAmt: 55, maxAmt: 55 },
  { merchant: 'Salesforce', category: 'SaaS', ticker: 'CRM', minAmt: 150, maxAmt: 150 },
  { merchant: 'Delta Airlines', category: 'Travel', ticker: 'DAL', minAmt: 180, maxAmt: 550 },
  { merchant: 'United Airlines', category: 'Travel', ticker: 'UAL', minAmt: 200, maxAmt: 600 },
  { merchant: 'Hilton', category: 'Travel', ticker: 'HLT', minAmt: 120, maxAmt: 350 },
  { merchant: 'Uber', category: 'Transportation', ticker: 'UBER', minAmt: 15, maxAmt: 50 },
  { merchant: 'Uber Eats', category: 'Meals', ticker: 'UBER', minAmt: 20, maxAmt: 60 },
  { merchant: 'Starbucks', category: 'Meals', ticker: 'SBUX', minAmt: 15, maxAmt: 45 },
  { merchant: 'FedEx', category: 'Shipping', ticker: 'FDX', minAmt: 15, maxAmt: 80 },
  { merchant: 'UPS', category: 'Shipping', ticker: 'UPS', minAmt: 12, maxAmt: 70 },
  { merchant: 'WeWork', category: 'Office', ticker: '', minAmt: 800, maxAmt: 900 },
]

/* ---- Transaction generation (same seeded PRNG as web) ---- */

function generateTransactions(
  merchants: MerchantEntry[],
  roundUp: number,
  seed: number,
  idOffset: number,
  memberNames?: string[],
): DemoTransaction[] {
  const rand = seededRng(seed)
  const txns: DemoTransaction[] = []
  let id = idOffset

  for (let day = 0; day < 365; day++) {
    const count = rand() < 0.1 ? 0 : rand() < 0.3 ? 1 : rand() < 0.7 ? 2 : rand() < 0.9 ? 3 : 4
    for (let t = 0; t < count; t++) {
      const m = merchants[Math.floor(rand() * merchants.length)]
      const amount = Math.round((m.minAmt + rand() * (m.maxAmt - m.minAmt)) * 100) / 100
      const fee = rand() < 0.3 ? 0 : Math.round(rand() * 3) / 100

      const statusRoll = rand()
      let status: DemoTransaction['status']
      let ticker: string
      let shares: number

      if (statusRoll < 0.13 || !m.ticker) {
        status = rand() < 0.5 ? 'pending' : 'mapped'
        ticker = ''
        shares = 0
      } else if (statusRoll < 0.25) {
        status = 'mapped'
        ticker = m.ticker
        shares = Math.round(rand() * 50) / 1000
      } else if (statusRoll < 0.40) {
        status = 'pending'
        ticker = m.ticker
        shares = 0
      } else {
        status = 'completed'
        ticker = m.ticker
        shares = Math.round(rand() * 80) / 1000 || 0.001
      }

      const tx: DemoTransaction = {
        id: id++,
        merchant: m.merchant,
        category: m.category,
        amount,
        round_up: roundUp,
        fee,
        ticker,
        shares,
        status,
        date: daysAgo(day),
        created_at: daysAgo(day),
      }

      if (memberNames && memberNames.length > 0) {
        tx.memberName = memberNames[Math.floor(rand() * memberNames.length)]
      }

      txns.push(tx)
    }
  }

  return txns
}

/* ---- Generate random transactions on demand (for Sync) ---- */

const merchantPools = {
  individual: individualMerchants,
  family: familyMerchants,
  business: businessMerchants,
}

const memberPools: Record<string, string[]> = {
  family: ['Carlos M.', 'Maria M.', 'Sofia M.'],
  business: ['Jordan B.', 'Priya S.', 'Marcus C.', 'Emily T.', 'David K.'],
}

let nextId = 90000

export function createRandomTransactions(
  type: 'individual' | 'family' | 'business',
  count: number,
  roundUp: number,
): DemoTransaction[] {
  const merchants = merchantPools[type]
  const members = memberPools[type]
  const today = new Date().toISOString().split('T')[0]
  const txns: DemoTransaction[] = []

  for (let i = 0; i < count; i++) {
    const m = merchants[Math.floor(Math.random() * merchants.length)]
    const amount = Math.round((m.minAmt + Math.random() * (m.maxAmt - m.minAmt)) * 100) / 100
    const hasTicker = !!m.ticker
    const status: DemoTransaction['status'] = hasTicker ? 'completed' : 'pending'

    const tx: DemoTransaction = {
      id: nextId++,
      merchant: m.merchant,
      category: m.category,
      amount,
      round_up: roundUp,
      fee: 0,
      ticker: hasTicker ? m.ticker : '',
      shares: hasTicker ? Math.round(Math.random() * 60) / 1000 || 0.001 : 0,
      status,
      date: today,
      created_at: today,
    }

    if (members && members.length > 0) {
      tx.memberName = members[Math.floor(Math.random() * members.length)]
    }

    txns.push(tx)
  }

  return txns
}

/* ---- Receipt items (same as web DemoReceiptModal) ---- */

export const RECEIPT_ITEMS = [
  { name: 'Great Value Whole Milk 1 gal', brand: 'Great Value', amount: 3.48, ticker: 'WMT', stockName: 'Walmart Inc.', confidence: 0.85 },
  { name: 'Coca-Cola Classic 12pk', brand: 'Coca-Cola', amount: 6.98, ticker: 'KO', stockName: 'The Coca-Cola Co.', confidence: 0.97 },
  { name: "Lay's Classic Potato Chips", brand: "Lay's", amount: 4.28, ticker: 'PEP', stockName: 'PepsiCo Inc.', confidence: 0.95 },
  { name: 'Tide Pods Original 42ct', brand: 'Tide', amount: 12.97, ticker: 'PG', stockName: 'Procter & Gamble', confidence: 0.98 },
  { name: 'Bounty Paper Towels 6pk', brand: 'Bounty', amount: 11.47, ticker: 'PG', stockName: 'Procter & Gamble', confidence: 0.96 },
  { name: "Ben & Jerry's Half Baked Pint", brand: "Ben & Jerry's", amount: 5.49, ticker: 'UL', stockName: 'Unilever PLC', confidence: 0.92 },
  { name: 'Organic Bananas 1 bunch', brand: null, amount: 1.67, ticker: '', stockName: '', confidence: 0 },
  { name: 'Fresh Bakery French Bread', brand: null, amount: 1.27, ticker: '', stockName: '', confidence: 0 },
  { name: 'Colgate Total Toothpaste 5.1oz', brand: 'Colgate', amount: 4.29, ticker: 'CL', stockName: 'Colgate-Palmolive', confidence: 0.94 },
  { name: 'Farm Fresh Large Eggs 12ct', brand: null, amount: 3.52, ticker: '', stockName: '', confidence: 0 },
]

export const RECEIPT_TOTAL = RECEIPT_ITEMS.reduce((s, i) => s + i.amount, 0)

export function buildReceiptAllocations(roundUp: number) {
  const map = new Map<string, { ticker: string; stockName: string; totalAmt: number; confidence: number }>()
  for (const item of RECEIPT_ITEMS) {
    if (!item.ticker) continue
    const existing = map.get(item.ticker)
    if (existing) {
      existing.totalAmt += item.amount
      existing.confidence = Math.max(existing.confidence, item.confidence)
    } else {
      map.set(item.ticker, { ticker: item.ticker, stockName: item.stockName, totalAmt: item.amount, confidence: item.confidence })
    }
  }

  const mappedTotal = Array.from(map.values()).reduce((s, v) => s + v.totalAmt, 0)

  return Array.from(map.values())
    .sort((a, b) => b.totalAmt - a.totalAmt)
    .map(v => {
      const pct = v.totalAmt / mappedTotal
      return {
        ticker: v.ticker,
        stockName: v.stockName,
        amount: Math.round(roundUp * pct * 100) / 100,
        percentage: Math.round(pct * 100),
        confidence: v.confidence,
      }
    })
}

/* ==================================================================== */
/*  INDIVIDUAL DEMO DATA                                                 */
/* ==================================================================== */

export const individualTransactions: DemoTransaction[] = generateTransactions(individualMerchants, 1, 42, 1)

export const individualHoldings: DemoHolding[] = [
  { id: 1, ticker: 'AAPL', companyName: 'Apple Inc.', domain: 'apple.com', shares: 0.342, avg_price: 178.50, current_price: 227.48, total_value: 77.80, day_change: 1.23, day_change_pct: 0.54 },
  { id: 2, ticker: 'AMZN', companyName: 'Amazon.com', domain: 'amazon.com', shares: 0.185, avg_price: 172.30, current_price: 205.74, total_value: 38.06, day_change: -0.87, day_change_pct: -0.42 },
  { id: 3, ticker: 'MSFT', companyName: 'Microsoft Corp.', domain: 'microsoft.com', shares: 0.128, avg_price: 385.20, current_price: 428.50, total_value: 54.85, day_change: 2.15, day_change_pct: 0.50 },
  { id: 4, ticker: 'GOOGL', companyName: 'Alphabet Inc.', domain: 'google.com', shares: 0.215, avg_price: 148.70, current_price: 175.98, total_value: 37.84, day_change: 0.67, day_change_pct: 0.38 },
  { id: 5, ticker: 'SBUX', companyName: 'Starbucks', domain: 'starbucks.com', shares: 0.892, avg_price: 92.40, current_price: 105.32, total_value: 93.95, day_change: -0.45, day_change_pct: -0.43 },
  { id: 6, ticker: 'UBER', companyName: 'Uber Technologies', domain: 'uber.com', shares: 0.156, avg_price: 68.90, current_price: 79.45, total_value: 12.39, day_change: 1.02, day_change_pct: 1.30 },
  { id: 7, ticker: 'NFLX', companyName: 'Netflix Inc.', domain: 'netflix.com', shares: 0.042, avg_price: 620.00, current_price: 948.75, total_value: 39.85, day_change: 3.50, day_change_pct: 0.37 },
  { id: 8, ticker: 'WMT', companyName: 'Walmart Inc.', domain: 'walmart.com', shares: 0.267, avg_price: 78.50, current_price: 91.83, total_value: 24.52, day_change: 0.34, day_change_pct: 0.37 },
]

export const individualGoals: DemoGoal[] = [
  { id: 1, name: 'Emergency Fund', target_amount: 500, current_amount: 312.45, deadline: monthsAgo(-6), status: 'active' },
  { id: 2, name: 'Vacation Savings', target_amount: 1200, current_amount: 478.90, deadline: monthsAgo(-9), status: 'active' },
  { id: 3, name: 'New Laptop', target_amount: 300, current_amount: 300, deadline: monthsAgo(1), status: 'completed' },
]

export const individualRecommendations: DemoRecommendation[] = [
  { type: 'saving', title: 'Increase your round-up multiplier', description: 'You average $1.00 per round-up. Switching to 2x would add an extra $54/month to your portfolio.', confidence: 0.92 },
  { type: 'investing', title: 'Diversify into ETFs', description: 'Your portfolio is 100% individual stocks. Adding an S&P 500 ETF could reduce volatility by 15%.', confidence: 0.87 },
  { type: 'spending', title: 'Shopping is your top category', description: 'You spent $215 on shopping this month. Consider setting a budget to maximize round-up efficiency.', confidence: 0.78 },
]

/* ==================================================================== */
/*  FAMILY DEMO DATA                                                     */
/* ==================================================================== */

const familyMemberNames = ['Carlos M.', 'Maria M.', 'Sofia M.']

export const familyTransactions: DemoTransaction[] = generateTransactions(familyMerchants, 2, 137, 5000, familyMemberNames)

export const familyHoldings: DemoHolding[] = [
  { id: 1, ticker: 'AAPL', companyName: 'Apple Inc.', domain: 'apple.com', shares: 0.682, avg_price: 175.00, current_price: 227.48, total_value: 155.14, day_change: 1.23, day_change_pct: 0.54 },
  { id: 2, ticker: 'AMZN', companyName: 'Amazon.com', domain: 'amazon.com', shares: 0.425, avg_price: 168.50, current_price: 205.74, total_value: 87.44, day_change: -0.87, day_change_pct: -0.42 },
  { id: 3, ticker: 'COST', companyName: 'Costco Wholesale', domain: 'costco.com', shares: 0.312, avg_price: 745.00, current_price: 912.50, total_value: 284.70, day_change: 4.20, day_change_pct: 0.46 },
  { id: 4, ticker: 'DIS', companyName: 'Walt Disney', domain: 'disney.com', shares: 1.245, avg_price: 98.30, current_price: 112.85, total_value: 140.50, day_change: -0.55, day_change_pct: -0.49 },
  { id: 5, ticker: 'SBUX', companyName: 'Starbucks', domain: 'starbucks.com', shares: 1.534, avg_price: 89.70, current_price: 105.32, total_value: 161.56, day_change: -0.45, day_change_pct: -0.43 },
  { id: 6, ticker: 'TGT', companyName: 'Target Corp.', domain: 'target.com', shares: 0.478, avg_price: 142.20, current_price: 138.67, total_value: 66.28, day_change: -1.85, day_change_pct: -1.32 },
  { id: 7, ticker: 'HD', companyName: 'Home Depot', domain: 'homedepot.com', shares: 0.189, avg_price: 355.00, current_price: 398.45, total_value: 75.31, day_change: 2.30, day_change_pct: 0.58 },
  { id: 8, ticker: 'NKE', companyName: 'Nike Inc.', domain: 'nike.com', shares: 0.534, avg_price: 108.50, current_price: 78.92, total_value: 42.14, day_change: 0.45, day_change_pct: 0.57 },
]

export const familyGoals: DemoGoal[] = [
  { id: 1, name: 'College Fund - Sofia', target_amount: 5000, current_amount: 1847.50, deadline: monthsAgo(-24), status: 'active' },
  { id: 2, name: 'Family Vacation', target_amount: 2500, current_amount: 1235.00, deadline: monthsAgo(-4), status: 'active' },
  { id: 3, name: 'Home Renovation', target_amount: 3000, current_amount: 678.90, deadline: monthsAgo(-12), status: 'active' },
  { id: 4, name: 'Holiday Gift Fund', target_amount: 800, current_amount: 800, deadline: monthsAgo(2), status: 'completed' },
]

export const familyRecommendations: DemoRecommendation[] = [
  { type: 'saving', title: 'Family round-ups are growing fast', description: 'Your family generated $268 in round-ups this month — 18% more than last month. Keep it up!', confidence: 0.95 },
  { type: 'investing', title: 'Rebalance home improvement holdings', description: 'Home Depot makes up 32% of your portfolio. Consider diversifying into other sectors.', confidence: 0.84 },
  { type: 'spending', title: 'Grocery spending is consistent', description: 'Your family spends an average of $288/month on groceries. This generates reliable round-ups.', confidence: 0.81 },
]

/* ==================================================================== */
/*  BUSINESS DEMO DATA                                                   */
/* ==================================================================== */

const businessMemberNames = ['Jordan B.', 'Priya S.', 'Marcus C.', 'Emily T.', 'David K.']

export const businessTransactions: DemoTransaction[] = generateTransactions(businessMerchants, 3, 999, 10000, businessMemberNames)

export const businessHoldings: DemoHolding[] = [
  { id: 1, ticker: 'AMZN', companyName: 'Amazon.com', domain: 'amazon.com', shares: 0.856, avg_price: 170.00, current_price: 205.74, total_value: 176.11, day_change: -0.87, day_change_pct: -0.42 },
  { id: 2, ticker: 'MSFT', companyName: 'Microsoft Corp.', domain: 'microsoft.com', shares: 0.642, avg_price: 390.00, current_price: 428.50, total_value: 275.10, day_change: 2.15, day_change_pct: 0.50 },
  { id: 3, ticker: 'GOOGL', companyName: 'Alphabet Inc.', domain: 'google.com', shares: 0.478, avg_price: 150.00, current_price: 175.98, total_value: 84.12, day_change: 0.67, day_change_pct: 0.38 },
  { id: 4, ticker: 'CRM', companyName: 'Salesforce Inc.', domain: 'salesforce.com', shares: 0.312, avg_price: 265.00, current_price: 312.45, total_value: 97.48, day_change: 1.45, day_change_pct: 0.47 },
  { id: 5, ticker: 'UBER', companyName: 'Uber Technologies', domain: 'uber.com', shares: 0.534, avg_price: 65.00, current_price: 79.45, total_value: 42.43, day_change: 1.02, day_change_pct: 1.30 },
  { id: 6, ticker: 'ADBE', companyName: 'Adobe Inc.', domain: 'adobe.com', shares: 0.089, avg_price: 510.00, current_price: 478.90, total_value: 42.62, day_change: -2.30, day_change_pct: -0.48 },
  { id: 7, ticker: 'DAL', companyName: 'Delta Air Lines', domain: 'delta.com', shares: 1.234, avg_price: 42.50, current_price: 55.67, total_value: 68.70, day_change: 0.89, day_change_pct: 1.62 },
  { id: 8, ticker: 'SBUX', companyName: 'Starbucks', domain: 'starbucks.com', shares: 0.345, avg_price: 95.00, current_price: 105.32, total_value: 36.34, day_change: -0.45, day_change_pct: -0.43 },
]

export const businessGoals: DemoGoal[] = [
  { id: 1, name: 'Q1 Investment Target', target_amount: 2500, current_amount: 1856.40, deadline: monthsAgo(-1), status: 'active' },
  { id: 2, name: 'Employee Benefit Fund', target_amount: 5000, current_amount: 2134.50, deadline: monthsAgo(-8), status: 'active' },
  { id: 3, name: 'Office Expansion Fund', target_amount: 10000, current_amount: 3245.80, deadline: monthsAgo(-18), status: 'active' },
  { id: 4, name: 'Holiday Bonus Pool', target_amount: 3000, current_amount: 3000, deadline: monthsAgo(1), status: 'completed' },
]

export const businessRecommendations: DemoRecommendation[] = [
  { type: 'investing', title: 'Cloud spending drives portfolio growth', description: 'AWS costs generate the largest round-ups. Your AMZN position has grown 14.7% as a result.', confidence: 0.93 },
  { type: 'saving', title: 'Optimize software subscriptions', description: 'You have 4 software subscriptions generating small round-ups. Consolidating billing could increase efficiency.', confidence: 0.86 },
  { type: 'spending', title: 'Travel budget is well-utilized', description: 'Business travel generates high-value round-ups averaging $0.61 per transaction.', confidence: 0.79 },
]

/* ==================================================================== */
/*  AGGREGATED DATA by type (for dashboard convenience)                  */
/* ==================================================================== */

export interface DemoDataSet {
  label: string
  userName: string
  roundUpAmount: number
  transactions: DemoTransaction[]
  holdings: DemoHolding[]
  goals: DemoGoal[]
  recommendations: DemoRecommendation[]
}

export const DEMO_DATA: Record<string, DemoDataSet> = {
  individual: {
    label: 'Individual',
    userName: 'Alex Johnson',
    roundUpAmount: 1,
    transactions: individualTransactions,
    holdings: individualHoldings,
    goals: individualGoals,
    recommendations: individualRecommendations,
  },
  family: {
    label: 'Family',
    userName: 'Martinez Family',
    roundUpAmount: 2,
    transactions: familyTransactions,
    holdings: familyHoldings,
    goals: familyGoals,
    recommendations: familyRecommendations,
  },
  business: {
    label: 'Business',
    userName: 'TechStart Co.',
    roundUpAmount: 3,
    transactions: businessTransactions,
    holdings: businessHoldings,
    goals: businessGoals,
    recommendations: businessRecommendations,
  },
}

/* ---- Chart helper (same as web buildChartData) ---- */

export function buildChartData(transactions: DemoTransaction[]) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const map = new Map<string, { sortKey: string; roundUps: number }>()

  for (const tx of transactions) {
    const d = new Date(tx.date)
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = map.get(label)
    if (existing) {
      existing.roundUps += tx.round_up
    } else {
      map.set(label, { sortKey, roundUps: tx.round_up })
    }
  }

  const sorted = Array.from(map.entries())
    .map(([, { sortKey, roundUps }]) => ({ sortKey, roundUps }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  let cumulative = 0
  return sorted.map(({ roundUps }) => {
    cumulative += roundUps
    return Math.round(cumulative * 100) / 100
  })
}
