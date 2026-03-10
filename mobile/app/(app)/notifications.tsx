import React from 'react'
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Bell, AlertCircle, CheckCircle, Info } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { LoadingSpinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

const iconMap: Record<string, any> = {
  success: CheckCircle,
  warning: AlertCircle,
  info: Info,
  error: AlertCircle,
}

const iconColorMap: Record<string, string> = {
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  error: '#EF4444',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function NotificationsScreen() {
  const { colors, brand } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuth()
  const { data: notifications, isLoading } = useNotifications(profile?.id)
  const queryClient = useQueryClient()

  async function markAsRead(id: number) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  async function markAllRead() {
    if (!profile?.id) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
        <Pressable onPress={markAllRead}>
          <Text style={[styles.markAllText, { color: brand.purple }]}>Mark all read</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      ) : !notifications?.length ? (
        <View style={styles.centered}>
          <Bell size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const Icon = iconMap[item.type] || Info
            const iconColor = iconColorMap[item.type] || colors.textSecondary
            return (
              <Pressable
                onPress={() => markAsRead(item.id)}
                style={[
                  styles.notifItem,
                  {
                    backgroundColor: item.read ? 'transparent' : `${brand.purple}0D`,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${iconColor}1A` }]}>
                  <Icon size={18} color={iconColor} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.notifMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={[styles.notifTime, { color: colors.textMuted }]}>
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
                {!item.read && (
                  <View style={[styles.unreadDot, { backgroundColor: brand.purple }]} />
                )}
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  markAllText: { fontSize: 13, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15 },
  listContent: { paddingBottom: 40 },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContent: { flex: 1, gap: 2 },
  notifTitle: { fontSize: 14, fontWeight: '600' },
  notifMessage: { fontSize: 13, lineHeight: 18 },
  notifTime: { fontSize: 11, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
})
