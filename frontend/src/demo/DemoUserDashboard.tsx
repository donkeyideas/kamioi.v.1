import { useState, useCallback, useMemo, useEffect } from 'react'
import { DashboardLayout, type NavItem, type NavSection } from '@/components/layout'
import { Button } from '@/components/ui/Button'
import { DemoOverviewTab } from './DemoOverviewTab'
import { DemoPortfolioTab } from './DemoPortfolioTab'
import { DemoTransactionsTab } from './DemoTransactionsTab'
import { DemoGoalsTab } from './DemoGoalsTab'
import { DemoAiInsightsTab } from './DemoAiInsightsTab'
import { DemoAnalyticsTab } from './DemoAnalyticsTab'
import { DemoNotificationsTab } from './DemoNotificationsTab'
import { DemoSettingsTab } from './DemoSettingsTab'
import { DemoReceiptModal, RECEIPT_ITEMS } from './DemoReceiptModal'
import type { DemoTransaction } from './demoData'
import {
  individualTransactions,
  individualHoldings,
  individualGoals,
  createRandomTransactions,
} from './demoData'
import { getDemoSession } from './useDemoSession'
import { logDemoVisit } from '@/services/api'

/* ---- Nav Config ---- */

const navSections: NavSection[] = [
  {
    items: [
      { id: 'overview', label: 'Overview', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { id: 'portfolio', label: 'Portfolio', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
      { id: 'transactions', label: 'Transactions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
      { id: 'goals', label: 'Goals', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
      { id: 'ai-insights', label: 'AI Insights', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="10" y1="22" x2="14" y2="22"/></svg> },
      { id: 'analytics', label: 'Analytics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
      { id: 'notifications', label: 'Notifications', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
      { id: 'settings', label: 'Settings', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
    ],
  },
]

const subtitleMap: Record<string, string> = {
  overview: 'Your investment overview and activity',
  portfolio: 'Your holdings and portfolio performance',
  transactions: 'View and manage your transactions',
  goals: 'Track your savings goals',
  'ai-insights': 'AI-powered insights and recommendations',
  analytics: 'Spending and investment analytics',
  notifications: 'Your notifications and alerts',
  settings: 'Manage your account settings',
}

/* ---- Demo Banner ---- */


/* ---- Page ---- */

export default function DemoUserDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [roundUpAmount, setRoundUpAmount] = useState(1)
  const [extraTx, setExtraTx] = useState<typeof individualTransactions>([])
  const [syncing, setSyncing] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const session = getDemoSession()
    if (session) logDemoVisit(session.session_token, session.email, 'individual')
  }, [])

  const allTransactions = useMemo(() => [...extraTx, ...individualTransactions], [extraTx])

  const handleNavigate = useCallback((item: NavItem) => {
    setActiveTab(item.id)
  }, [])

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => {
      const count = 3 + Math.floor(Math.random() * 4)
      const newTx = createRandomTransactions('individual', count, roundUpAmount)
      setExtraTx(prev => [...newTx, ...prev])
      setSyncing(false)
      setActiveTab('transactions')
      setToast(`+${count} transactions synced!`)
      setTimeout(() => setToast(''), 3000)
    }, 1500)
  }

  const handleReceiptComplete = () => {
    const today = new Date().toISOString().split('T')[0]
    const receiptTx: DemoTransaction = {
      id: Date.now(),
      merchant: 'Walmart',
      category: 'Receipt',
      amount: RECEIPT_ITEMS.reduce((s, i) => s + i.amount, 0),
      round_up: roundUpAmount,
      fee: 0,
      ticker: 'WMT',
      shares: 0,
      status: 'completed',
      date: today,
      created_at: today,
      subItems: RECEIPT_ITEMS.map(item => ({
        name: item.name,
        brand: item.brand,
        amount: item.amount,
        ticker: item.ticker,
        stockName: item.stockName,
      })),
    }
    setExtraTx(prev => [receiptTx, ...prev])
    setActiveTab('transactions')
    setToast('Receipt processed! Investment confirmed.')
    setTimeout(() => setToast(''), 3000)
  }

  function renderContent() {
    switch (activeTab) {
      case 'overview':
        return <DemoOverviewTab transactions={allTransactions} holdings={individualHoldings} dashboardLabel="Portfolio" roundUpOverride={roundUpAmount} />
      case 'portfolio':
        return <DemoPortfolioTab holdings={individualHoldings} />
      case 'transactions':
        return <DemoTransactionsTab transactions={allTransactions} roundUpOverride={roundUpAmount} />
      case 'goals':
        return <DemoGoalsTab initialGoals={individualGoals} />
      case 'ai-insights':
        return <DemoAiInsightsTab transactions={allTransactions} roundUpOverride={roundUpAmount} />
      case 'analytics':
        return <DemoAnalyticsTab transactions={allTransactions} roundUpOverride={roundUpAmount} />
      case 'notifications':
        return <DemoNotificationsTab />
      case 'settings':
        return <DemoSettingsTab profile={{ name: 'Alex Johnson', email: 'alex@demo.kamioi.com', phone: '(555) 123-4567', city: 'Austin', state: 'TX', roundUpAmount, plan: 'Individual Pro' }} onRoundUpChange={setRoundUpAmount} />
      default:
        return <DemoOverviewTab transactions={allTransactions} holdings={individualHoldings} dashboardLabel="Portfolio" roundUpOverride={roundUpAmount} />
    }
  }

  return (
    <DashboardLayout
      navSections={navSections}
      activeNavId={activeTab}
      onNavigate={handleNavigate}
      sidebarUser={{ name: 'Alex Johnson', role: 'Demo Investor', initials: 'AJ' }}
      greeting="Welcome, Alex (Demo)"
      userInitials="AJ"
      logoText="Kamioi Demo"
      headerActions={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => setReceiptOpen(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v.5"/><path d="M12 6v.5"/></svg>
              Upload Receipt
            </span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleSync} loading={syncing}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              Sync Transactions
            </span>
          </Button>
        </div>
      }
    >
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', color: '#fff',
          padding: '12px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {toast}
        </div>
      )}

      <h1 className="aurora-page-title">
        {activeTab === 'overview' ? 'Dashboard Overview' : navSections[0].items.find(i => i.id === activeTab)?.label || 'Dashboard'}
      </h1>
      <p className="aurora-page-subtitle">
        {subtitleMap[activeTab] || 'Your investment overview and activity'}
      </p>
      {renderContent()}
      <DemoReceiptModal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        roundUpAmount={roundUpAmount}
        onComplete={handleReceiptComplete}
      />
    </DashboardLayout>
  )
}
