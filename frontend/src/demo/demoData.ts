/* ------------------------------------------------------------------ */
/*  Demo Data — completely static, never touches the real system       */
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
  subItems?: ReceiptSubItem[]
}

export type DemoHolding = {
  id: number
  ticker: string
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

export type DemoNotification = {
  id: number
  title: string
  message: string
  type: 'info' | 'success' | 'warning'
  read: boolean
  created_at: string
}

export type DemoMember = {
  id: number
  name: string
  email: string
  role: string
  round_ups_total: number
  transactions_count: number
  joined: string
}

export type DemoReport = {
  id: number
  title: string
  period: string
  total_invested: number
  total_fees: number
  portfolio_value: number
  created_at: string
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

/* ---- Seeded PRNG for deterministic data ---- */
function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return s / 0x7fffffff
  }
}

type MerchantEntry = { merchant: string; category: string; ticker: string; minAmt: number; maxAmt: number }

const individualMerchants: MerchantEntry[] = [
  { merchant: 'Starbucks', category: 'Coffee', ticker: 'SBUX', minAmt: 4, maxAmt: 9 },
  { merchant: 'Dunkin', category: 'Coffee', ticker: 'DNKN', minAmt: 3, maxAmt: 8 },
  { merchant: 'Amazon', category: 'Shopping', ticker: 'AMZN', minAmt: 12, maxAmt: 180 },
  { merchant: 'Walmart', category: 'Groceries', ticker: 'WMT', minAmt: 25, maxAmt: 175 },
  { merchant: 'Target', category: 'Shopping', ticker: 'TGT', minAmt: 15, maxAmt: 120 },
  { merchant: 'Costco', category: 'Groceries', ticker: 'COST', minAmt: 60, maxAmt: 280 },
  { merchant: 'Whole Foods', category: 'Groceries', ticker: 'AMZN', minAmt: 30, maxAmt: 140 },
  { merchant: 'Trader Joe\'s', category: 'Groceries', ticker: '', minAmt: 20, maxAmt: 95 },
  { merchant: 'Chipotle', category: 'Dining', ticker: 'CMG', minAmt: 9, maxAmt: 18 },
  { merchant: 'McDonald\'s', category: 'Dining', ticker: 'MCD', minAmt: 6, maxAmt: 14 },
  { merchant: 'Chick-fil-A', category: 'Dining', ticker: '', minAmt: 7, maxAmt: 16 },
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
  { merchant: 'Lowe\'s', category: 'Home', ticker: 'LOW', minAmt: 20, maxAmt: 180 },
  { merchant: 'CVS', category: 'Health', ticker: 'CVS', minAmt: 8, maxAmt: 45 },
  { merchant: 'Walgreens', category: 'Health', ticker: 'WBA', minAmt: 6, maxAmt: 40 },
  { merchant: 'Nike', category: 'Shopping', ticker: 'NKE', minAmt: 35, maxAmt: 180 },
  { merchant: 'Local Diner', category: 'Dining', ticker: '', minAmt: 10, maxAmt: 28 },
  { merchant: 'Joe\'s Car Wash', category: 'Auto', ticker: '', minAmt: 12, maxAmt: 25 },
  { merchant: 'Corner Bakery', category: 'Dining', ticker: '', minAmt: 5, maxAmt: 15 },
]

const familyMerchants: MerchantEntry[] = [
  { merchant: 'Costco', category: 'Groceries', ticker: 'COST', minAmt: 80, maxAmt: 320 },
  { merchant: 'Walmart', category: 'Groceries', ticker: 'WMT', minAmt: 40, maxAmt: 200 },
  { merchant: 'Target', category: 'Shopping', ticker: 'TGT', minAmt: 20, maxAmt: 150 },
  { merchant: 'Amazon', category: 'Shopping', ticker: 'AMZN', minAmt: 15, maxAmt: 200 },
  { merchant: 'Publix', category: 'Groceries', ticker: '', minAmt: 30, maxAmt: 160 },
  { merchant: 'Whole Foods', category: 'Groceries', ticker: 'AMZN', minAmt: 40, maxAmt: 180 },
  { merchant: 'Disney+', category: 'Entertainment', ticker: 'DIS', minAmt: 14, maxAmt: 14 },
  { merchant: 'Netflix', category: 'Entertainment', ticker: 'NFLX', minAmt: 16, maxAmt: 23 },
  { merchant: 'Starbucks', category: 'Coffee', ticker: 'SBUX', minAmt: 5, maxAmt: 12 },
  { merchant: 'Chick-fil-A', category: 'Dining', ticker: '', minAmt: 15, maxAmt: 40 },
  { merchant: 'Chipotle', category: 'Dining', ticker: 'CMG', minAmt: 20, maxAmt: 45 },
  { merchant: 'Shell', category: 'Gas', ticker: 'SHEL', minAmt: 35, maxAmt: 70 },
  { merchant: 'BP', category: 'Gas', ticker: 'BP', minAmt: 30, maxAmt: 65 },
  { merchant: 'Home Depot', category: 'Home', ticker: 'HD', minAmt: 25, maxAmt: 250 },
  { merchant: 'Uber', category: 'Transportation', ticker: 'UBER', minAmt: 10, maxAmt: 40 },
  { merchant: 'CVS', category: 'Health', ticker: 'CVS', minAmt: 10, maxAmt: 50 },
  { merchant: 'Walgreens', category: 'Health', ticker: 'WBA', minAmt: 8, maxAmt: 45 },
  { merchant: 'Nike', category: 'Shopping', ticker: 'NKE', minAmt: 40, maxAmt: 200 },
  { merchant: 'Apple', category: 'Technology', ticker: 'AAPL', minAmt: 1, maxAmt: 15 },
  { merchant: 'McDonald\'s', category: 'Dining', ticker: 'MCD', minAmt: 12, maxAmt: 30 },
  { merchant: 'Pizza Hut', category: 'Dining', ticker: 'YUM', minAmt: 15, maxAmt: 35 },
  { merchant: 'Local Pharmacy', category: 'Health', ticker: '', minAmt: 8, maxAmt: 30 },
  { merchant: 'Sam\'s Club', category: 'Groceries', ticker: 'WMT', minAmt: 60, maxAmt: 250 },
  { merchant: 'Aldi', category: 'Groceries', ticker: '', minAmt: 25, maxAmt: 90 },
]

const businessMerchants: MerchantEntry[] = [
  { merchant: 'Amazon Web Services', category: 'SaaS', ticker: 'AMZN', minAmt: 150, maxAmt: 800 },
  { merchant: 'Google Cloud', category: 'SaaS', ticker: 'GOOGL', minAmt: 100, maxAmt: 500 },
  { merchant: 'Microsoft 365', category: 'SaaS', ticker: 'MSFT', minAmt: 22, maxAmt: 22 },
  { merchant: 'Slack', category: 'SaaS', ticker: 'CRM', minAmt: 12, maxAmt: 13 },
  { merchant: 'Zoom', category: 'SaaS', ticker: 'ZM', minAmt: 15, maxAmt: 15 },
  { merchant: 'Adobe', category: 'SaaS', ticker: 'ADBE', minAmt: 55, maxAmt: 55 },
  { merchant: 'Salesforce', category: 'SaaS', ticker: 'CRM', minAmt: 150, maxAmt: 150 },
  { merchant: 'LinkedIn', category: 'SaaS', ticker: 'MSFT', minAmt: 60, maxAmt: 60 },
  { merchant: 'GitHub', category: 'SaaS', ticker: 'MSFT', minAmt: 44, maxAmt: 44 },
  { merchant: 'Delta Airlines', category: 'Travel', ticker: 'DAL', minAmt: 180, maxAmt: 550 },
  { merchant: 'American Airlines', category: 'Travel', ticker: 'AAL', minAmt: 150, maxAmt: 500 },
  { merchant: 'United Airlines', category: 'Travel', ticker: 'UAL', minAmt: 200, maxAmt: 600 },
  { merchant: 'Hilton', category: 'Travel', ticker: 'HLT', minAmt: 120, maxAmt: 350 },
  { merchant: 'Marriott', category: 'Travel', ticker: 'MAR', minAmt: 140, maxAmt: 400 },
  { merchant: 'Uber', category: 'Transportation', ticker: 'UBER', minAmt: 15, maxAmt: 50 },
  { merchant: 'Uber Eats', category: 'Meals', ticker: 'UBER', minAmt: 20, maxAmt: 60 },
  { merchant: 'Starbucks', category: 'Meals', ticker: 'SBUX', minAmt: 15, maxAmt: 45 },
  { merchant: 'FedEx', category: 'Shipping', ticker: 'FDX', minAmt: 15, maxAmt: 80 },
  { merchant: 'UPS', category: 'Shipping', ticker: 'UPS', minAmt: 12, maxAmt: 70 },
  { merchant: 'Staples', category: 'Office Supplies', ticker: '', minAmt: 20, maxAmt: 150 },
  { merchant: 'Office Depot', category: 'Office Supplies', ticker: '', minAmt: 25, maxAmt: 180 },
  { merchant: 'WeWork', category: 'Office', ticker: '', minAmt: 800, maxAmt: 900 },
  { merchant: 'Local Print Shop', category: 'Office Supplies', ticker: '', minAmt: 15, maxAmt: 90 },
  { merchant: 'Subway', category: 'Meals', ticker: '', minAmt: 8, maxAmt: 18 },
]

function generateTransactions(
  merchants: MerchantEntry[],
  roundUp: number,
  seed: number,
  idOffset: number,
): DemoTransaction[] {
  const rand = seededRng(seed)
  const txns: DemoTransaction[] = []
  let id = idOffset

  // Generate 1 year of transactions — some days have 0-4 transactions
  for (let day = 0; day < 365; day++) {
    const count = rand() < 0.1 ? 0 : rand() < 0.3 ? 1 : rand() < 0.7 ? 2 : rand() < 0.9 ? 3 : 4
    for (let t = 0; t < count; t++) {
      const m = merchants[Math.floor(rand() * merchants.length)]
      const amount = Math.round((m.minAmt + rand() * (m.maxAmt - m.minAmt)) * 100) / 100
      const fee = rand() < 0.3 ? 0 : Math.round(rand() * 3) / 100

      // Status distribution: ~60% completed, ~15% pending, ~12% mapped, ~13% failed/no ticker
      const statusRoll = rand()
      let status: DemoTransaction['status']
      let ticker: string
      let shares: number

      if (statusRoll < 0.13 || !m.ticker) {
        // Failed mapping — no ticker
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

      txns.push({
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
      })
    }
  }

  return txns
}

/* ---- Generate random transactions on demand (for Sync / Receipt) ---- */

const merchantPools = {
  individual: individualMerchants,
  family: familyMerchants,
  business: businessMerchants,
}

let nextId = 90000

export function createRandomTransactions(
  type: 'individual' | 'family' | 'business',
  count: number,
  roundUp: number,
): DemoTransaction[] {
  const merchants = merchantPools[type]
  const today = new Date().toISOString().split('T')[0]
  const txns: DemoTransaction[] = []

  for (let i = 0; i < count; i++) {
    const m = merchants[Math.floor(Math.random() * merchants.length)]
    const amount = Math.round((m.minAmt + Math.random() * (m.maxAmt - m.minAmt)) * 100) / 100
    const hasTicker = !!m.ticker
    const status: DemoTransaction['status'] = hasTicker ? 'completed' : 'pending'

    txns.push({
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
    })
  }

  return txns
}

/* ==================================================================== */
/*  INDIVIDUAL DEMO DATA                                                */
/* ==================================================================== */

export const individualTransactions: DemoTransaction[] = generateTransactions(individualMerchants, 1, 42, 1)

export const individualHoldings: DemoHolding[] = [
  { id: 1, ticker: 'AAPL', shares: 0.342, avg_price: 178.50, current_price: 227.48, total_value: 77.80, day_change: 1.23, day_change_pct: 0.54 },
  { id: 2, ticker: 'AMZN', shares: 0.185, avg_price: 172.30, current_price: 205.74, total_value: 38.06, day_change: -0.87, day_change_pct: -0.42 },
  { id: 3, ticker: 'MSFT', shares: 0.128, avg_price: 385.20, current_price: 428.50, total_value: 54.85, day_change: 2.15, day_change_pct: 0.50 },
  { id: 4, ticker: 'GOOGL', shares: 0.215, avg_price: 148.70, current_price: 175.98, total_value: 37.84, day_change: 0.67, day_change_pct: 0.38 },
  { id: 5, ticker: 'SBUX', shares: 0.892, avg_price: 92.40, current_price: 105.32, total_value: 93.95, day_change: -0.45, day_change_pct: -0.43 },
  { id: 6, ticker: 'UBER', shares: 0.156, avg_price: 68.90, current_price: 79.45, total_value: 12.39, day_change: 1.02, day_change_pct: 1.30 },
  { id: 7, ticker: 'NFLX', shares: 0.042, avg_price: 620.00, current_price: 948.75, total_value: 39.85, day_change: 3.50, day_change_pct: 0.37 },
  { id: 8, ticker: 'WMT', shares: 0.267, avg_price: 78.50, current_price: 91.83, total_value: 24.52, day_change: 0.34, day_change_pct: 0.37 },
]

export const individualGoals: DemoGoal[] = [
  { id: 1, name: 'Emergency Fund', target_amount: 500, current_amount: 312.45, deadline: monthsAgo(-6), status: 'active' },
  { id: 2, name: 'Vacation Savings', target_amount: 1200, current_amount: 478.90, deadline: monthsAgo(-9), status: 'active' },
  { id: 3, name: 'New Laptop', target_amount: 300, current_amount: 300, deadline: monthsAgo(1), status: 'completed' },
]

/* ==================================================================== */
/*  FAMILY DEMO DATA                                                    */
/* ==================================================================== */

export const familyMembers: DemoMember[] = [
  { id: 1, name: 'Carlos Martinez', email: 'carlos@demo.com', role: 'Head of Household', round_ups_total: 542, transactions_count: 271, joined: monthsAgo(12) },
  { id: 2, name: 'Maria Martinez', email: 'maria@demo.com', role: 'Member', round_ups_total: 438, transactions_count: 219, joined: monthsAgo(12) },
  { id: 3, name: 'Sofia Martinez', email: 'sofia@demo.com', role: 'Member', round_ups_total: 312, transactions_count: 156, joined: monthsAgo(10) },
]

export const familyTransactions: DemoTransaction[] = generateTransactions(familyMerchants, 2, 137, 5000)

export const familyHoldings: DemoHolding[] = [
  { id: 1, ticker: 'AAPL', shares: 0.682, avg_price: 175.00, current_price: 227.48, total_value: 155.14, day_change: 1.23, day_change_pct: 0.54 },
  { id: 2, ticker: 'AMZN', shares: 0.425, avg_price: 168.50, current_price: 205.74, total_value: 87.44, day_change: -0.87, day_change_pct: -0.42 },
  { id: 3, ticker: 'COST', shares: 0.312, avg_price: 745.00, current_price: 912.50, total_value: 284.70, day_change: 4.20, day_change_pct: 0.46 },
  { id: 4, ticker: 'DIS', shares: 1.245, avg_price: 98.30, current_price: 112.85, total_value: 140.50, day_change: -0.55, day_change_pct: -0.49 },
  { id: 5, ticker: 'SBUX', shares: 1.534, avg_price: 89.70, current_price: 105.32, total_value: 161.56, day_change: -0.45, day_change_pct: -0.43 },
  { id: 6, ticker: 'TGT', shares: 0.478, avg_price: 142.20, current_price: 138.67, total_value: 66.28, day_change: -1.85, day_change_pct: -1.32 },
  { id: 7, ticker: 'HD', shares: 0.189, avg_price: 355.00, current_price: 398.45, total_value: 75.31, day_change: 2.30, day_change_pct: 0.58 },
  { id: 8, ticker: 'NKE', shares: 0.534, avg_price: 108.50, current_price: 78.92, total_value: 42.14, day_change: 0.45, day_change_pct: 0.57 },
]

export const familyGoals: DemoGoal[] = [
  { id: 1, name: 'College Fund - Sofia', target_amount: 5000, current_amount: 1847.50, deadline: monthsAgo(-24), status: 'active' },
  { id: 2, name: 'Family Vacation', target_amount: 2500, current_amount: 1235.00, deadline: monthsAgo(-4), status: 'active' },
  { id: 3, name: 'Home Renovation', target_amount: 3000, current_amount: 678.90, deadline: monthsAgo(-12), status: 'active' },
  { id: 4, name: 'Holiday Gift Fund', target_amount: 800, current_amount: 800, deadline: monthsAgo(2), status: 'completed' },
]

/* ==================================================================== */
/*  BUSINESS DEMO DATA                                                  */
/* ==================================================================== */

export const businessTeam: DemoMember[] = [
  { id: 1, name: 'Jordan Blake', email: 'jordan@techstart.demo', role: 'CEO', round_ups_total: 876, transactions_count: 292, joined: monthsAgo(12) },
  { id: 2, name: 'Priya Sharma', email: 'priya@techstart.demo', role: 'CTO', round_ups_total: 723, transactions_count: 241, joined: monthsAgo(12) },
  { id: 3, name: 'Marcus Chen', email: 'marcus@techstart.demo', role: 'CFO', round_ups_total: 654, transactions_count: 218, joined: monthsAgo(11) },
  { id: 4, name: 'Emily Torres', email: 'emily@techstart.demo', role: 'VP Sales', round_ups_total: 489, transactions_count: 163, joined: monthsAgo(9) },
  { id: 5, name: 'David Kim', email: 'david@techstart.demo', role: 'Engineer', round_ups_total: 378, transactions_count: 126, joined: monthsAgo(7) },
]

export const businessTransactions: DemoTransaction[] = generateTransactions(businessMerchants, 3, 999, 10000)

export const businessHoldings: DemoHolding[] = [
  { id: 1, ticker: 'AMZN', shares: 0.856, avg_price: 170.00, current_price: 205.74, total_value: 176.11, day_change: -0.87, day_change_pct: -0.42 },
  { id: 2, ticker: 'MSFT', shares: 0.642, avg_price: 390.00, current_price: 428.50, total_value: 275.10, day_change: 2.15, day_change_pct: 0.50 },
  { id: 3, ticker: 'GOOGL', shares: 0.478, avg_price: 150.00, current_price: 175.98, total_value: 84.12, day_change: 0.67, day_change_pct: 0.38 },
  { id: 4, ticker: 'CRM', shares: 0.312, avg_price: 265.00, current_price: 312.45, total_value: 97.48, day_change: 1.45, day_change_pct: 0.47 },
  { id: 5, ticker: 'UBER', shares: 0.534, avg_price: 65.00, current_price: 79.45, total_value: 42.43, day_change: 1.02, day_change_pct: 1.30 },
  { id: 6, ticker: 'ADBE', shares: 0.089, avg_price: 510.00, current_price: 478.90, total_value: 42.62, day_change: -2.30, day_change_pct: -0.48 },
  { id: 7, ticker: 'DAL', shares: 1.234, avg_price: 42.50, current_price: 55.67, total_value: 68.70, day_change: 0.89, day_change_pct: 1.62 },
  { id: 8, ticker: 'SBUX', shares: 0.345, avg_price: 95.00, current_price: 105.32, total_value: 36.34, day_change: -0.45, day_change_pct: -0.43 },
]

export const businessGoals: DemoGoal[] = [
  { id: 1, name: 'Q1 Investment Target', target_amount: 2500, current_amount: 1856.40, deadline: monthsAgo(-1), status: 'active' },
  { id: 2, name: 'Employee Benefit Fund', target_amount: 5000, current_amount: 2134.50, deadline: monthsAgo(-8), status: 'active' },
  { id: 3, name: 'Office Expansion Fund', target_amount: 10000, current_amount: 3245.80, deadline: monthsAgo(-18), status: 'active' },
  { id: 4, name: 'Holiday Bonus Pool', target_amount: 3000, current_amount: 3000, deadline: monthsAgo(1), status: 'completed' },
]

export const businessReports: DemoReport[] = [
  { id: 1, title: 'February 2026 Summary', period: 'Feb 2026', total_invested: 456.78, total_fees: 11.42, portfolio_value: 822.90, created_at: monthsAgo(0) },
  { id: 2, title: 'January 2026 Summary', period: 'Jan 2026', total_invested: 512.34, total_fees: 12.81, portfolio_value: 745.23, created_at: monthsAgo(1) },
  { id: 3, title: 'December 2025 Summary', period: 'Dec 2025', total_invested: 398.90, total_fees: 9.97, portfolio_value: 678.45, created_at: monthsAgo(2) },
  { id: 4, title: 'Q4 2025 Quarterly Report', period: 'Q4 2025', total_invested: 1234.56, total_fees: 30.86, portfolio_value: 2156.78, created_at: monthsAgo(3) },
]

/* ==================================================================== */
/*  SHARED / COMMON                                                     */
/* ==================================================================== */

export const demoNotifications: DemoNotification[] = [
  { id: 1, title: 'Round-up processed', message: 'Your $1 round-up from Starbucks has been invested in SBUX.', type: 'success', read: false, created_at: daysAgo(0) },
  { id: 2, title: 'New stock added', message: 'NFLX has been added to your portfolio from a Netflix transaction.', type: 'info', read: false, created_at: daysAgo(1) },
  { id: 3, title: 'Goal milestone', message: 'You\'re 62% of the way to your Emergency Fund goal!', type: 'info', read: true, created_at: daysAgo(3) },
  { id: 4, title: 'Weekly summary', message: 'This week you invested $14 across 14 transactions.', type: 'info', read: true, created_at: daysAgo(7) },
  { id: 5, title: 'Market alert', message: 'AAPL is up 2.3% today. Your holdings are performing well.', type: 'success', read: true, created_at: daysAgo(8) },
  { id: 6, title: 'Pending transaction', message: 'Trader Joe\'s transaction is awaiting merchant mapping.', type: 'warning', read: true, created_at: daysAgo(10) },
]

/* ---- AI insights ---- */

export type DemoInsight = {
  id: number
  type: 'saving' | 'investing' | 'spending' | 'general'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
}

export const demoInsights: DemoInsight[] = [
  { id: 1, type: 'investing', priority: 'high', title: 'Diversification Opportunity', description: 'Your portfolio is heavily weighted in tech stocks. Consider adding exposure to healthcare (JNJ, UNH) or consumer staples (PG, KO) for better diversification.' },
  { id: 2, type: 'saving', priority: 'medium', title: 'Round-Up Optimization', description: 'Increasing your round-up to $1.00 could add an extra $15/month to your investments based on your spending patterns.' },
  { id: 3, type: 'spending', priority: 'medium', title: 'Spending Pattern Detected', description: 'Your coffee spending averages $28/week. Consider brewing at home 2 days a week to save ~$12/week ($624/year).' },
  { id: 4, type: 'general', priority: 'low', title: 'Goal Progress', description: 'At your current pace, you\'ll reach your Emergency Fund goal by August 2026. Great progress!' },
  { id: 5, type: 'investing', priority: 'medium', title: 'Top Performer', description: 'NFLX in your portfolio has gained 53% since your average purchase price. Consider taking partial profits.' },
]

/* ---- Chart helper data ---- */

export function buildChartData(transactions: DemoTransaction[]) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const map = new Map<string, { sortKey: string; spending: number; roundUps: number }>()

  for (const tx of transactions) {
    const d = new Date(tx.date)
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = map.get(label)
    if (existing) {
      existing.spending += tx.amount
      existing.roundUps += tx.round_up
    } else {
      map.set(label, { sortKey, spending: tx.amount, roundUps: tx.round_up })
    }
  }

  const sorted = Array.from(map.entries())
    .map(([name, { sortKey, spending, roundUps }]) => ({ name, sortKey, spending, roundUps }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  let cumulative = 0
  return sorted.map(({ name, spending, roundUps }) => {
    cumulative += roundUps
    return {
      name,
      spending: Math.round(spending * 100) / 100,
      roundUps: Math.round(roundUps * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    }
  })
}
