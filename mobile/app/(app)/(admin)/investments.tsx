import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { Badge, GlassCard, LoadingSpinner } from '@/components/ui'

interface QueueRow {
  id: number
  ticker: string | null
  amount: number
  status: string
  created_at: string
}

interface LedgerRow {
  id: number
  round_up_amount: number
  status: string
  created_at: string
}

type BrokerStatus = 'sandbox' | 'live' | 'not_connected'

export default function AdminInvestmentsScreen() {
  const { colors, brand } = useTheme()
  const insets = useSafeAreaInsets()
  const [queue, setQueue] = useState<QueueRow[]>([])
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const [brokerStatus, setBrokerStatus] = useState<BrokerStatus>('not_connected')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    const [queueRes, ledgerRes, brokerRes] = await Promise.all([
      supabase.from('market_queue').select('id, ticker, amount, status, created_at')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('roundup_ledger').select('id, round_up_amount, status, created_at')
        .order('created_at', { ascending: false }).limit(50),
      supabase.from('admin_settings').select('setting_value')
        .eq('setting_key', 'alpaca_api_key').maybeSingle(),
    ])

    setQueue(queueRes.data ?? [])
    setLedger(ledgerRes.data ?? [])

    if (brokerRes.data?.setting_value) {
      const key = brokerRes.data.setting_value.trim()
      if (key.startsWith('PK') || key.startsWith('CK')) setBrokerStatus('sandbox')
      else if (key.startsWith('AK')) setBrokerStatus('live')
      else setBrokerStatus('sandbox')
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  const usd = (n: number) => `$${n.toFixed(2)}`

  const brokerLabel = brokerStatus === 'live' ? 'Alpaca Live' : brokerStatus === 'sandbox' ? 'Alpaca Sandbox' : 'Not Connected'
  const brokerColor = brokerStatus === 'live' ? '#10B981' : brokerStatus === 'sandbox' ? '#F59E0B' : '#6B7280'

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function statusVariant(s: string): 'success' | 'warning' | 'error' | 'info' {
    if (s === 'executed' || s === 'swept') return 'success'
    if (s === 'queued' || s === 'pending') return 'warning'
    if (s === 'failed') return 'error'
    return 'info'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Investments</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Queue & ledger management</Text>
        </View>

        {/* Broker Status */}
        <View style={[styles.brokerCard, { backgroundColor: brokerColor + '15', borderColor: brokerColor + '33' }]}>
          <Text style={[styles.brokerLabel, { color: colors.textSecondary }]}>Order Processor</Text>
          <View style={styles.brokerRow}>
            <View style={[styles.brokerDot, { backgroundColor: brokerColor, shadowColor: brokerColor }]} />
            <Text style={[styles.brokerText, { color: brokerColor }]}>{brokerLabel}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><LoadingSpinner /></View>
        ) : (
          <>
            {/* Market Queue */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Market Queue ({queue.length})
              </Text>
              {queue.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No queued orders</Text>
              ) : queue.map(item => (
                <View key={item.id} style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowTicker, { color: colors.textPrimary }]}>
                      {item.ticker ?? 'Pending'}
                    </Text>
                    <Text style={[styles.rowDate, { color: colors.textMuted }]}>{formatDate(item.created_at)}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowAmount, { color: colors.textPrimary }]}>{usd(item.amount)}</Text>
                    <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                  </View>
                </View>
              ))}
            </GlassCard>

            {/* Round-Up Ledger */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Round-Up Ledger ({ledger.length})
              </Text>
              {ledger.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No ledger entries</Text>
              ) : ledger.map(item => (
                <View key={item.id} style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowTicker, { color: colors.textPrimary }]}>
                      {usd(item.round_up_amount)}
                    </Text>
                    <Text style={[styles.rowDate, { color: colors.textMuted }]}>{formatDate(item.created_at)}</Text>
                  </View>
                  <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                </View>
              ))}
            </GlassCard>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  headerSub: { fontSize: 14 },
  brokerCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  brokerLabel: { fontSize: 13 },
  brokerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brokerDot: { width: 8, height: 8, borderRadius: 4, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2 },
  brokerText: { fontSize: 13, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5 },
  rowLeft: { gap: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowTicker: { fontSize: 14, fontWeight: '600' },
  rowDate: { fontSize: 11 },
  rowAmount: { fontSize: 14, fontWeight: '600' },
  emptyText: { textAlign: 'center', paddingVertical: 20, fontSize: 13 },
})
