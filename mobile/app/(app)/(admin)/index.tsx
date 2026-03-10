import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Users, CreditCard, TrendingUp, Briefcase } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { KpiCard, GlassCard, LoadingSpinner } from '@/components/ui'

interface PlatformStats {
  totalUsers: number
  totalTransactions: number
  totalRoundUps: number
  portfolioValue: number
}

export default function AdminOverviewScreen() {
  const { colors, brand } = useTheme()
  const insets = useSafeAreaInsets()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = useCallback(async () => {
    const [usersRes, txnRes, roundUpRes, portfolioRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('round_up'),
      supabase.from('portfolios').select('total_value'),
    ])

    const totalRoundUps = (roundUpRes.data ?? []).reduce(
      (sum, t) => sum + (t.round_up ?? 0), 0
    )
    const portfolioValue = (portfolioRes.data ?? []).reduce(
      (sum, p) => sum + (p.total_value ?? 0), 0
    )

    setStats({
      totalUsers: usersRes.count ?? 0,
      totalTransactions: txnRes.count ?? 0,
      totalRoundUps: parseFloat(totalRoundUps.toFixed(2)),
      portfolioValue: parseFloat(portfolioValue.toFixed(2)),
    })
    setLoading(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStats()
    setRefreshing(false)
  }, [fetchStats])

  const usd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Admin Dashboard</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Platform overview</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><LoadingSpinner /></View>
        ) : stats && (
          <>
            {/* KPI Grid */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <KpiCard
                  icon={<Users size={18} color={brand.purple} />}
                  label="Total Users"
                  value={String(stats.totalUsers)}
                />
              </View>
              <View style={styles.kpiCol}>
                <KpiCard
                  icon={<CreditCard size={18} color={brand.blue} />}
                  label="Transactions"
                  value={String(stats.totalTransactions)}
                />
              </View>
              <View style={styles.kpiCol}>
                <KpiCard
                  icon={<TrendingUp size={18} color={brand.teal} />}
                  label="Total Round-Ups"
                  value={usd(stats.totalRoundUps)}
                />
              </View>
              <View style={styles.kpiCol}>
                <KpiCard
                  icon={<Briefcase size={18} color={brand.pink} />}
                  label="Portfolio Value"
                  value={usd(stats.portfolioValue)}
                />
              </View>
            </View>

            {/* Quick Info */}
            <GlassCard>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Platform Status</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Backend</Text>
                <Text style={[styles.infoValue, { color: '#10B981' }]}>Supabase Cloud</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Stock Prices</Text>
                <Text style={[styles.infoValue, { color: '#10B981' }]}>Yahoo Finance</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>v2.0</Text>
              </View>
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
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  headerSub: { fontSize: 14 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCol: { width: '47%', flexGrow: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
})
