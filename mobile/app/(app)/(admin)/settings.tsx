import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, Switch, Pressable, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LogOut, Eye, Key, Shield } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { GlassCard, Badge, Button, LoadingSpinner } from '@/components/ui'

interface SettingToggle {
  key: string
  label: string
  description: string
  value: boolean
}

interface ApiKeyStatus {
  key: string
  label: string
  connected: boolean
}

export default function AdminSettingsScreen() {
  const { colors, brand } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toggles, setToggles] = useState<SettingToggle[]>([
    { key: 'signin_enabled', label: 'Sign-In Enabled', description: 'Allow users to sign in', value: true },
    { key: 'signup_enabled', label: 'Sign-Up Enabled', description: 'Allow new user registration', value: true },
    { key: 'demo_mode', label: 'Demo Mode', description: 'Show demo access on login', value: false },
  ])
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([])

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'signin_enabled', 'signup_enabled', 'demo_mode',
        'alpaca_api_key', 'deepseek_api_key', 'anthropic_api_key', 'openai_api_key',
      ])

    if (data) {
      const map = new Map(data.map(s => [s.setting_key, s.setting_value]))

      setToggles(prev => prev.map(t => ({
        ...t,
        value: map.get(t.key) === 'true' || (map.get(t.key) !== 'false' && t.key !== 'demo_mode'),
      })))

      setApiKeys([
        { key: 'alpaca_api_key', label: 'Alpaca (Trading)', connected: !!map.get('alpaca_api_key') },
        { key: 'deepseek_api_key', label: 'DeepSeek (AI)', connected: !!map.get('deepseek_api_key') },
        { key: 'anthropic_api_key', label: 'Anthropic (AI)', connected: !!map.get('anthropic_api_key') },
        { key: 'openai_api_key', label: 'OpenAI (AI)', connected: !!map.get('openai_api_key') },
      ])
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchSettings()
    setRefreshing(false)
  }, [fetchSettings])

  async function handleToggle(key: string, newValue: boolean) {
    // Optimistic update
    setToggles(prev => prev.map(t => t.key === key ? { ...t, value: newValue } : t))

    const { error } = await supabase
      .from('admin_settings')
      .update({ setting_value: String(newValue) })
      .eq('setting_key', key)

    if (error) {
      // Revert on error
      setToggles(prev => prev.map(t => t.key === key ? { ...t, value: !newValue } : t))
    }
  }

  async function handleSignOut() {
    await useAuthStore.getState().signOut()
    router.replace('/(auth)/login')
  }

  function handleViewAsUser() {
    router.push('/(app)/(user)')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>System configuration</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><LoadingSpinner /></View>
        ) : (
          <>
            {/* Access Control */}
            <GlassCard>
              <View style={styles.sectionHeader}>
                <Shield size={18} color={brand.purple} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Access Control</Text>
              </View>
              {toggles.map(toggle => (
                <View key={toggle.key} style={[styles.toggleRow, { borderBottomColor: colors.borderSubtle }]}>
                  <View style={styles.toggleInfo}>
                    <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{toggle.label}</Text>
                    <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>{toggle.description}</Text>
                  </View>
                  <Switch
                    value={toggle.value}
                    onValueChange={(v) => handleToggle(toggle.key, v)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: brand.purple + '66' }}
                    thumbColor={toggle.value ? brand.purple : '#ccc'}
                  />
                </View>
              ))}
            </GlassCard>

            {/* API Keys Status */}
            <GlassCard>
              <View style={styles.sectionHeader}>
                <Key size={18} color={brand.blue} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>API Keys</Text>
              </View>
              {apiKeys.map(api => (
                <View key={api.key} style={[styles.apiRow, { borderBottomColor: colors.borderSubtle }]}>
                  <Text style={[styles.apiLabel, { color: colors.textPrimary }]}>{api.label}</Text>
                  <Badge variant={api.connected ? 'success' : 'error'}>
                    {api.connected ? 'Connected' : 'Not Set'}
                  </Badge>
                </View>
              ))}
            </GlassCard>

            {/* Actions */}
            <GlassCard>
              <Pressable
                style={[styles.actionRow, { borderBottomColor: colors.borderSubtle }]}
                onPress={handleViewAsUser}
              >
                <Eye size={18} color={brand.blue} />
                <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>View as User</Text>
                <Text style={[styles.actionHint, { color: colors.textMuted }]}>Switch to user dashboard</Text>
              </Pressable>
            </GlassCard>

            {/* Sign Out */}
            <View style={styles.signOutWrap}>
              <Button variant="danger" onPress={handleSignOut} icon={<LogOut size={18} color="#fff" />}>
                Sign Out
              </Button>
            </View>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5 },
  toggleInfo: { flex: 1, gap: 2, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleDesc: { fontSize: 12 },
  apiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5 },
  apiLabel: { fontSize: 14 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 0.5 },
  actionLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  actionHint: { fontSize: 12 },
  signOutWrap: { marginTop: 24 },
})
