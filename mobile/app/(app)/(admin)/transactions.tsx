import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, RefreshControl, TextInput } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { Badge, CompanyLogo, LoadingSpinner } from '@/components/ui'

interface TxnRow {
  id: number
  merchant: string
  amount: number
  round_up: number | null
  status: string
  category: string | null
  created_at: string
  users: { name: string; email: string } | null
}

export default function AdminTransactionsScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [transactions, setTransactions] = useState<TxnRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('id, merchant, amount, round_up, status, category, created_at, users!inner(name, email)')
      .order('created_at', { ascending: false })
      .limit(100)

    setTransactions((data as TxnRow[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchTransactions()
    setRefreshing(false)
  }, [fetchTransactions])

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions
    const q = search.toLowerCase()
    return transactions.filter(t =>
      t.merchant?.toLowerCase().includes(q) ||
      t.users?.name?.toLowerCase().includes(q) ||
      t.users?.email?.toLowerCase().includes(q)
    )
  }, [transactions, search])

  const usd = (n: number) => `$${n.toFixed(2)}`

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function statusVariant(s: string): 'success' | 'warning' | 'error' | 'info' {
    if (s === 'completed' || s === 'processed') return 'success'
    if (s === 'pending') return 'warning'
    if (s === 'failed') return 'error'
    return 'info'
  }

  const renderItem = useCallback(({ item }: { item: TxnRow }) => (
    <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
      <CompanyLogo domain={item.merchant?.toLowerCase().replace(/\s+/g, '') + '.com'} size={36} />
      <View style={styles.rowInfo}>
        <Text style={[styles.merchant, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.merchant}
        </Text>
        <Text style={[styles.userText, { color: colors.textMuted }]} numberOfLines={1}>
          {item.users?.name || item.users?.email || 'Unknown'}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>{usd(item.amount)}</Text>
        {item.round_up != null && item.round_up > 0 && (
          <Text style={[styles.roundUp, { color: '#10B981' }]}>+{usd(item.round_up)}</Text>
        )}
        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
      </View>
    </View>
  ), [colors])

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Transactions</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          All platform transactions
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { paddingHorizontal: 20 }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search merchant or user..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}><LoadingSpinner /></View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}

          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions found</Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  headerSub: { fontSize: 14 },
  searchWrap: { marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  rowInfo: { flex: 1, gap: 2 },
  merchant: { fontSize: 14, fontWeight: '600' },
  userText: { fontSize: 11 },
  rowRight: { alignItems: 'flex-end', gap: 3 },
  amount: { fontSize: 14, fontWeight: '600' },
  roundUp: { fontSize: 11, fontWeight: '600' },
  emptyText: { textAlign: 'center', paddingTop: 40, fontSize: 14 },
})
