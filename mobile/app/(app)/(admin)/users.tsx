import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, RefreshControl, TextInput } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { Badge, GlassCard, LoadingSpinner } from '@/components/ui'

interface UserRow {
  id: number
  email: string
  name: string
  account_type: string
  subscription_tier: string | null
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  admin: '#7C3AED',
  individual: '#10B981',
  family: '#3B82F6',
  business: '#06B6D4',
}

export default function AdminUsersScreen() {
  const { colors, brand } = useTheme()
  const insets = useSafeAreaInsets()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('id, email, name, account_type, subscription_tier, created_at')
      .order('created_at', { ascending: false })

    setUsers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchUsers()
    setRefreshing(false)
  }, [fetchUsers])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  function getInitials(name: string) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const renderItem = useCallback(({ item }: { item: UserRow }) => {
    const typeColor = TYPE_COLORS[item.account_type] ?? colors.textMuted
    return (
      <View style={[styles.userRow, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.avatar, { backgroundColor: typeColor + '22' }]}>
          <Text style={[styles.avatarText, { color: typeColor }]}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name || 'Unnamed'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.email}
          </Text>
        </View>
        <View style={styles.userMeta}>
          <Badge variant={item.account_type === 'admin' ? 'warning' : 'info'}>
            {item.account_type}
          </Badge>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    )
  }, [colors])

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Users</Text>
        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
          {users.length} total accounts
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { paddingHorizontal: 20 }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search users..."
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
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No users found</Text>
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
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700' },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 14, fontWeight: '600' },
  userEmail: { fontSize: 12 },
  userMeta: { alignItems: 'flex-end', gap: 4 },
  dateText: { fontSize: 11 },
  emptyText: { textAlign: 'center', paddingTop: 40, fontSize: 14 },
})
