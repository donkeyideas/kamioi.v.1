import React, { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  Linking,
  Switch,
  TextInput,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import {
  User,
  Lock,
  Building,
  ArrowUpDown,
  ScanLine,
  Palette,
  Shield,
  Bell,
  HelpCircle,
  Mail,
  FileText,
  ScrollText,
  Trash2,
  ChevronRight,
  LogOut,
  X,
  Target,
} from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/hooks/useAuth'
import { useUserSettings, useUpdateSetting } from '@/hooks/useUserSettings'
import { GlassCard, Badge, LoadingSpinner, Button, Input, AlertModal } from '@/components/ui'
import type { AlertButton } from '@/components/ui/AlertModal'
import { formatCurrency } from '@/utils/format'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'
import * as LocalAuthentication from 'expo-local-authentication'

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const ROUND_UP_OPTIONS = [
  { amount: 1, label: '$1' },
  { amount: 2, label: '$2' },
  { amount: 3, label: '$3' },
]

const AI_PROVIDERS = [
  { key: 'deepseek', label: 'DeepSeek', desc: 'Most affordable' },
  { key: 'claude', label: 'Claude', desc: 'Most accurate' },
  { key: 'openai', label: 'OpenAI', desc: 'Balanced' },
]

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function MoreScreen() {
  const { colors, brand, gradientColors, mode, setTheme } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile, signOut } = useAuth()
  const { data: settings = {}, isLoading } = useUserSettings(profile?.id)
  const updateSetting = useUpdateSetting()
  const queryClient = useQueryClient()

  // Modal states
  const [editProfileVisible, setEditProfileVisible] = useState(false)
  const [changePasswordVisible, setChangePasswordVisible] = useState(false)
  const [roundUpPickerVisible, setRoundUpPickerVisible] = useState(false)
  const [aiProviderPickerVisible, setAiProviderPickerVisible] = useState(false)
  const [helpVisible, setHelpVisible] = useState(false)
  const [linkedAccountsVisible, setLinkedAccountsVisible] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
  const [linkedLoading, setLinkedLoading] = useState(false)

  // Custom round-up
  const [customRoundUp, setCustomRoundUp] = useState('')

  // API Key
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaving, setApiKeySaving] = useState(false)

  // In-app alert
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message?: string; buttons?: AlertButton[] }>({ visible: false, title: '' })
  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }, [])

  // Edit profile form
  const [profileForm, setProfileForm] = useState({
    name: profile?.name ?? '',
    phone: profile?.phone ?? '',
    city: profile?.city ?? '',
    state: profile?.state ?? '',
    zip_code: profile?.zip_code ?? '',
  })
  const [profileSaving, setProfileSaving] = useState(false)

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const initials = useMemo(() => {
    if (!profile?.name) return '?'
    return profile.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [profile?.name])

  /* ---- Handlers ---- */

  const handleSaveProfile = useCallback(async () => {
    if (!profile?.id) return
    setProfileSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim() || null,
          city: profileForm.city.trim() || null,
          state: profileForm.state.trim() || null,
          zip_code: profileForm.zip_code.trim() || null,
        })
        .eq('id', profile.id)

      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      // Update auth store profile
      const { data } = await supabase.from('users').select('*').eq('id', profile.id).single()
      if (data) {
        useAuthStore.setState({ profile: data as any })
      }
      showAlert('Success', 'Profile updated successfully.')
      setEditProfileVisible(false)
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to update profile.')
    } finally {
      setProfileSaving(false)
    }
  }, [profile?.id, profileForm, queryClient])

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 8) {
      showAlert('Error', 'Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      showAlert('Error', 'Passwords do not match.')
      return
    }
    setPasswordSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      showAlert('Success', 'Password changed successfully.')
      setNewPassword('')
      setConfirmPassword('')
      setChangePasswordVisible(false)
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to change password.')
    } finally {
      setPasswordSaving(false)
    }
  }, [newPassword, confirmPassword])

  const handleOpenLinkedAccounts = useCallback(async () => {
    setLinkedAccountsVisible(true)
    setLinkedLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('teller-list-accounts', { body: {} })
      if (error) throw error
      setLinkedAccounts(data?.enrollments || [])
    } catch (err: any) {
      setLinkedAccounts([])
    } finally {
      setLinkedLoading(false)
    }
  }, [])

  const handleDisconnectAccount = useCallback(async (enrollmentId: string, name: string) => {
    showAlert(
      'Disconnect Account',
      `Are you sure you want to unlink ${name || 'this account'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.functions.invoke('teller-disconnect', { body: { enrollment_id: enrollmentId } })
              setLinkedAccounts(prev => prev.filter(e => e.enrollment_id !== enrollmentId))
              showAlert('Success', 'Account disconnected.')
            } catch {
              showAlert('Error', 'Failed to disconnect account.')
            }
          },
        },
      ]
    )
  }, [showAlert])

  const handleSyncAccounts = useCallback(async () => {
    try {
      showAlert('Syncing', 'Syncing transactions from linked accounts...')
      const { data, error } = await supabase.functions.invoke('teller-sync-transactions', { body: {} })
      if (error) throw error
      showAlert('Sync Complete', `Synced ${data?.synced || 0} transactions, mapped ${data?.mapped || 0} to stocks.`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to sync transactions.')
    }
  }, [queryClient, showAlert])

  const handleSetRoundUp = useCallback(async (amount: number) => {
    if (!profile?.id) return
    if (amount <= 0 || amount > 100) {
      showAlert('Error', 'Please enter a valid amount between $1 and $100.')
      return
    }
    try {
      const { error } = await supabase
        .from('users')
        .update({ round_up_amount: amount })
        .eq('id', profile.id)
      if (error) throw error
      useAuthStore.setState((s) => ({
        profile: s.profile ? { ...s.profile, round_up_amount: amount } : null,
      }))
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      setRoundUpPickerVisible(false)
      setCustomRoundUp('')
      showAlert('Success', `Round-up amount set to $${amount}.`)
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to update round-up amount.')
    }
  }, [profile?.id, queryClient])

  const handleCustomRoundUp = useCallback(() => {
    const num = parseFloat(customRoundUp)
    if (isNaN(num) || num <= 0) {
      showAlert('Error', 'Please enter a valid dollar amount.')
      return
    }
    handleSetRoundUp(Math.round(num * 100) / 100)
  }, [customRoundUp, handleSetRoundUp])

  const handleSetAiProvider = useCallback(async (provider: string) => {
    if (!profile?.id) return
    try {
      await updateSetting.mutateAsync({
        userId: profile.id,
        key: 'ai_vision_provider',
        value: provider,
      })
      showAlert('Success', `AI provider set to ${provider}.`)
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to update AI provider.')
    }
  }, [profile?.id, updateSetting])

  const handleSaveApiKey = useCallback(async () => {
    if (!profile?.id) return
    if (!apiKeyInput.trim()) {
      showAlert('Error', 'Please enter an API key.')
      return
    }
    setApiKeySaving(true)
    try {
      await updateSetting.mutateAsync({
        userId: profile.id,
        key: 'ai_vision_api_key',
        value: apiKeyInput.trim(),
      })
      showAlert('Success', 'API key saved. Your key will be used for receipt processing.')
      setAiProviderPickerVisible(false)
      setApiKeyInput('')
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Failed to save API key.')
    } finally {
      setApiKeySaving(false)
    }
  }, [profile?.id, apiKeyInput, updateSetting])

  const handleToggleTheme = useCallback(() => {
    setTheme(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setTheme])

  const handleToggleBiometric = useCallback(async (val: boolean) => {
    if (!profile?.id) return
    try {
      if (val) {
        // Check hardware availability
        const compatible = await LocalAuthentication.hasHardwareAsync()
        if (!compatible) {
          showAlert('Not Available', 'Biometric authentication is not available on this device.')
          return
        }
        const enrolled = await LocalAuthentication.isEnrolledAsync()
        if (!enrolled) {
          showAlert('Not Set Up', 'No biometrics are enrolled on this device. Please set up Face ID or fingerprint in your device settings.')
          return
        }
        // Prompt for biometric verification
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify your identity to enable biometric unlock',
          fallbackLabel: 'Use passcode',
          cancelLabel: 'Cancel',
        })
        if (!result.success) {
          return // User cancelled or failed
        }
      }
      await updateSetting.mutateAsync({
        userId: profile.id,
        key: 'biometric_unlock',
        value: val ? 'true' : 'false',
      })
    } catch {
      showAlert('Error', 'Failed to update biometric setting.')
    }
  }, [profile?.id, updateSetting, showAlert])

  const handleTogglePush = useCallback(async (val: boolean) => {
    if (!profile?.id) return
    try {
      await updateSetting.mutateAsync({
        userId: profile.id,
        key: 'push_notifications',
        value: val ? 'true' : 'false',
      })
    } catch {
      showAlert('Error', 'Failed to update notification setting.')
    }
  }, [profile?.id, updateSetting, showAlert])

  const handleSignOut = () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  const handleDeleteData = () => {
    showAlert(
      'Delete My Data',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Learn More',
          onPress: () => router.push('/(legal)/data-deletion'),
        },
      ]
    )
  }

  /* ---- Derived values ---- */

  const roundUpValue = profile?.round_up_amount
    ? formatCurrency(profile.round_up_amount)
    : '--'
  const aiProvider = settings['ai_vision_provider'] || 'deepseek'
  const aiProviderLabel = AI_PROVIDERS.find(p => p.key === aiProvider)?.label ?? aiProvider
  const themeName = mode === 'dark' ? 'Dark' : 'Light'
  const biometricEnabled = settings['biometric_unlock'] === 'true'
  const pushEnabled = settings['push_notifications'] !== 'false'
  const linkedCount = profile?.account_id ? '1 account' : '0 accounts'

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.base, paddingTop: insets.top }]}>
        <LoadingSpinner />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <GlassCard borderRadius={16} padding={20} style={styles.profileCard}>
          <View style={styles.profileRow}>
            <LinearGradient
              colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.textPrimary }]}>
                {profile?.name ?? 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {profile?.email ?? ''}
              </Text>
            </View>
            <Badge variant="purple">{profile?.account_type ?? 'individual'}</Badge>
          </View>
        </GlassCard>

        {/* ACCOUNT */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>ACCOUNT</Text>
        <GlassCard borderRadius={12} padding={0} style={styles.groupCard}>
          <SettingRow
            icon={User} iconColor={brand.purple} iconBg={`${brand.purple}1A`}
            label="Edit Profile"
            onPress={() => {
              setProfileForm({
                name: profile?.name ?? '',
                phone: profile?.phone ?? '',
                city: profile?.city ?? '',
                state: profile?.state ?? '',
                zip_code: profile?.zip_code ?? '',
              })
              setEditProfileVisible(true)
            }}
            colors={colors}
            showBorder
          />
          <SettingRow
            icon={Lock} iconColor={brand.blue} iconBg={`${brand.blue}1A`}
            label="Change Password"
            onPress={() => {
              setNewPassword('')
              setConfirmPassword('')
              setChangePasswordVisible(true)
            }}
            colors={colors}
            showBorder
          />
          <SettingRow
            icon={Building} iconColor={brand.teal} iconBg={`${brand.teal}1A`}
            label="Linked Accounts" value={linkedCount}
            onPress={handleOpenLinkedAccounts}
            colors={colors}
            showBorder
          />
          <SettingRow
            icon={Target} iconColor="#F59E0B" iconBg="rgba(245, 158, 11, 0.1)"
            label="Goals"
            onPress={() => router.push('/(app)/(user)/goals')}
            colors={colors}
          />
        </GlassCard>

        {/* PREFERENCES */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>PREFERENCES</Text>
        <GlassCard borderRadius={12} padding={0} style={styles.groupCard}>
          <SettingRow
            icon={ArrowUpDown} iconColor={brand.purple} iconBg={`${brand.purple}1A`}
            label="Round-Up Amount" value={roundUpValue}
            onPress={() => setRoundUpPickerVisible(true)}
            colors={colors}
            showBorder
          />
          <SettingRow
            icon={ScanLine} iconColor={brand.blue} iconBg={`${brand.blue}1A`}
            label="AI Provider" value={aiProviderLabel}
            onPress={() => setAiProviderPickerVisible(true)}
            colors={colors}
            showBorder
          />
          <View style={styles.settingsRow}>
            <View style={[styles.iconSquare, { backgroundColor: `${brand.pink}1A` }]}>
              <Palette size={18} color={brand.pink} />
            </View>
            <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Theme</Text>
            <Text style={[styles.settingsValue, { color: colors.textMuted }]}>{themeName}</Text>
            <Switch
              value={mode === 'dark'}
              onValueChange={handleToggleTheme}
              trackColor={{ false: colors.borderSubtle, true: `${brand.purple}80` }}
              thumbColor={mode === 'dark' ? brand.purple : '#f4f3f4'}
            />
          </View>
        </GlassCard>

        {/* SECURITY */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>SECURITY</Text>
        <GlassCard borderRadius={12} padding={0} style={styles.groupCard}>
          <View style={[styles.settingsRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle }]}>
            <View style={[styles.iconSquare, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Shield size={18} color="#10B981" />
            </View>
            <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Biometric Unlock</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.borderSubtle, true: `${brand.purple}80` }}
              thumbColor={biometricEnabled ? brand.purple : '#f4f3f4'}
            />
          </View>
          <View style={styles.settingsRow}>
            <View style={[styles.iconSquare, { backgroundColor: `${brand.blue}1A` }]}>
              <Bell size={18} color={brand.blue} />
            </View>
            <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>Push Notifications</Text>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePush}
              trackColor={{ false: colors.borderSubtle, true: `${brand.purple}80` }}
              thumbColor={pushEnabled ? brand.purple : '#f4f3f4'}
            />
          </View>
        </GlassCard>

        {/* SUPPORT */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>SUPPORT</Text>
        <GlassCard borderRadius={12} padding={0} style={styles.groupCard}>
          <SettingRow
            icon={HelpCircle} iconColor={brand.teal} iconBg={`${brand.teal}1A`}
            label="Help & FAQ"
            onPress={() => setHelpVisible(true)}
            colors={colors}
            showBorder
          />
          <SettingRow
            icon={Mail} iconColor={brand.blue} iconBg={`${brand.blue}1A`}
            label="Contact Us"
            onPress={() => Linking.openURL('mailto:support@kamioi.com')}
            colors={colors}
          />
        </GlassCard>

        {/* LEGAL */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>LEGAL</Text>
        <GlassCard borderRadius={12} padding={0} style={styles.groupCard}>
          <SettingRow
            icon={FileText} iconColor={brand.purple} iconBg={`${brand.purple}1A`}
            label="Privacy Policy"
            onPress={() => router.push('/(legal)/privacy')}
            colors={colors}
            showBorder
          />
          <SettingRow
            icon={ScrollText} iconColor={brand.blue} iconBg={`${brand.blue}1A`}
            label="Terms of Service"
            onPress={() => router.push('/(legal)/terms')}
            colors={colors}
            showBorder
          />
          <SettingRow
            icon={Trash2} iconColor="#EF4444" iconBg="rgba(239, 68, 68, 0.1)"
            label="Delete My Data"
            onPress={handleDeleteData}
            colors={colors}
          />
        </GlassCard>

        {/* Version */}
        <Text style={[styles.version, { color: colors.textMuted }]}>Kamioi v2.0.0</Text>

        {/* Sign Out */}
        <Pressable
          style={[styles.signOutBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}
          onPress={handleSignOut}
        >
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ============================================================ */}
      {/*  Edit Profile Modal                                           */}
      {/* ============================================================ */}
      <Modal
        visible={editProfileVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <View style={[styles.overlay, ]}>
          <View style={[styles.popupLarge, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
              <Pressable onPress={() => setEditProfileVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Input
                label="Name"
                placeholder="Your full name"
                value={profileForm.name}
                onChangeText={(t: string) => setProfileForm(prev => ({ ...prev, name: t }))}
              />
              <View style={{ height: 16 }} />
              <View style={styles.inputReadonly}>
                <Text style={[styles.inputReadonlyLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.inputReadonlyValue, { color: colors.textMuted }]}>{profile?.email ?? ''}</Text>
              </View>
              <View style={{ height: 16 }} />
              <Input
                label="Phone"
                placeholder="(555) 123-4567"
                value={profileForm.phone}
                onChangeText={(t: string) => setProfileForm(prev => ({ ...prev, phone: t }))}
                keyboardType="phone-pad"
              />
              <View style={{ height: 16 }} />
              <View style={styles.addressRow}>
                <View style={{ flex: 2 }}>
                  <Input
                    label="City"
                    placeholder="City"
                    value={profileForm.city}
                    onChangeText={(t: string) => setProfileForm(prev => ({ ...prev, city: t }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="State"
                    placeholder="ST"
                    value={profileForm.state}
                    onChangeText={(t: string) => setProfileForm(prev => ({ ...prev, state: t }))}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Zip"
                    placeholder="12345"
                    value={profileForm.zip_code}
                    onChangeText={(t: string) => setProfileForm(prev => ({ ...prev, zip_code: t }))}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={{ height: 24 }} />
              <Button onPress={handleSaveProfile} loading={profileSaving}>
                Save Profile
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/*  Change Password Modal                                        */}
      {/* ============================================================ */}
      <Modal
        visible={changePasswordVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setChangePasswordVisible(false)}
      >
        <View style={[styles.overlay, ]}>
          <View style={[styles.popup, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Change Password</Text>
              <Pressable onPress={() => setChangePasswordVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalContent}>
              <Input
                label="New Password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              <View style={{ height: 16 }} />
              <Input
                label="Confirm Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
              <View style={{ height: 24 }} />
              <Button onPress={handleChangePassword} loading={passwordSaving}>
                Update Password
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/*  Round-Up Picker Modal                                        */}
      {/* ============================================================ */}
      <Modal
        visible={roundUpPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRoundUpPickerVisible(false)}
      >
        <View style={[styles.overlay, ]}>
          <View style={[styles.popup, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Round-Up Amount</Text>
              <Pressable onPress={() => setRoundUpPickerVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalContent}>
            <Text style={[styles.pickerDesc, { color: colors.textSecondary }]}>
              Choose how much each purchase is rounded up for investing.
            </Text>
            <View style={styles.pickerOptions}>
              {ROUND_UP_OPTIONS.map(opt => {
                const isActive = profile?.round_up_amount === opt.amount
                return (
                  <Pressable
                    key={opt.amount}
                    onPress={() => handleSetRoundUp(opt.amount)}
                    style={[
                      styles.pickerOption,
                      {
                        backgroundColor: isActive ? `${brand.purple}1A` : colors.surfaceInput,
                        borderColor: isActive ? brand.purple : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text style={[styles.pickerOptionText, { color: isActive ? brand.purple : colors.textPrimary }]}>
                      {opt.label}
                    </Text>
                    {isActive && <Badge variant="success">Active</Badge>}
                  </Pressable>
                )
              })}
              {/* Custom amount */}
              <View style={[styles.pickerOption, { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.pickerOptionText, { color: colors.textPrimary, marginRight: 8 }]}>$</Text>
                <TextInput
                  style={[styles.customInput, { color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                  placeholder="Custom"
                  placeholderTextColor={colors.textMuted}
                  value={customRoundUp}
                  onChangeText={setCustomRoundUp}
                  keyboardType="decimal-pad"
                  onSubmitEditing={handleCustomRoundUp}
                />
                <Pressable
                  onPress={handleCustomRoundUp}
                  style={[styles.customSetBtn, { backgroundColor: `${brand.purple}1A` }]}
                >
                  <Text style={[styles.customSetBtnText, { color: brand.purple }]}>Set</Text>
                </Pressable>
              </View>
            </View>
          </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/*  AI Provider Picker Modal                                     */}
      {/* ============================================================ */}
      <Modal
        visible={aiProviderPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAiProviderPickerVisible(false)}
      >
        <View style={[styles.overlay, ]}>
          <View style={[styles.popupLarge, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>AI Receipt Provider</Text>
              <Pressable onPress={() => setAiProviderPickerVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.pickerDesc, { color: colors.textSecondary }]}>
              Choose which AI processes your uploaded receipts.
            </Text>
            <View style={styles.pickerOptions}>
              {AI_PROVIDERS.map(p => {
                const isActive = aiProvider === p.key
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => handleSetAiProvider(p.key)}
                    style={[
                      styles.pickerOption,
                      {
                        backgroundColor: isActive ? `${brand.purple}1A` : colors.surfaceInput,
                        borderColor: isActive ? brand.purple : colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerOptionText, { color: isActive ? brand.purple : colors.textPrimary }]}>
                        {p.label}
                      </Text>
                      <Text style={[styles.pickerOptionDesc, { color: colors.textMuted }]}>
                        {p.desc}
                      </Text>
                    </View>
                    {isActive && <Badge variant="success">Active</Badge>}
                  </Pressable>
                )
              })}
            </View>

            {/* API Key Section */}
            <View style={[styles.apiKeySection, { borderTopColor: colors.borderSubtle }]}>
              <Text style={[styles.apiKeyTitle, { color: colors.textPrimary }]}>API Key</Text>
              <Text style={[styles.apiKeyDesc, { color: colors.textSecondary }]}>
                Enter your own API key for the selected provider. Required for receipt scanning.
              </Text>
              <View style={styles.apiKeyRow}>
                <TextInput
                  style={[
                    styles.apiKeyInput,
                    {
                      backgroundColor: colors.surfaceInput,
                      borderColor: colors.borderSubtle,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder={settings['ai_vision_api_key'] ? '••••••••' : 'sk-...'}
                  placeholderTextColor={colors.textMuted}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <Pressable
                  onPress={handleSaveApiKey}
                  disabled={apiKeySaving}
                  style={[styles.apiKeySaveBtn, { backgroundColor: brand.purple }]}
                >
                  <Text style={styles.apiKeySaveBtnText}>
                    {apiKeySaving ? '...' : 'Save'}
                  </Text>
                </Pressable>
              </View>
              {settings['ai_vision_api_key'] && (
                <Text style={[styles.apiKeyStatus, { color: '#10B981' }]}>
                  Key saved for {aiProviderLabel}
                </Text>
              )}
            </View>
          </ScrollView>
          </View>
        </View>
      </Modal>
      {/* ============================================================ */}
      {/*  Linked Accounts Modal                                          */}
      {/* ============================================================ */}
      <Modal
        visible={linkedAccountsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLinkedAccountsVisible(false)}
      >
        <View style={[styles.overlay, ]}>
          <View style={[styles.popupLarge, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Linked Accounts</Text>
              <Pressable onPress={() => setLinkedAccountsVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {linkedLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <LoadingSpinner />
              </View>
            ) : linkedAccounts.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }}>
                <Building size={40} color={colors.textMuted} />
                <Text style={[{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }]}>No Linked Accounts</Text>
                <Text style={[{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }]}>
                  Link your bank account from the web dashboard to automatically sync transactions.
                </Text>
              </View>
            ) : (
              <>
                {linkedAccounts.map((enrollment: any) => (
                  <View
                    key={enrollment.enrollment_id}
                    style={[styles.linkedCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                  >
                    <View style={styles.linkedCardHeader}>
                      <View style={[styles.iconSquare, { backgroundColor: `${brand.teal}1A` }]}>
                        <Building size={18} color={brand.teal} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }]}>
                          {enrollment.institution_name || 'Bank Account'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: enrollment.is_active ? '#10B981' : '#EF4444' }} />
                          <Text style={[{ fontSize: 12, color: colors.textMuted }]}>
                            {enrollment.is_active ? 'Connected' : 'Disconnected'}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => handleDisconnectAccount(enrollment.enrollment_id, enrollment.institution_name)}
                        style={[styles.unlinkBtn, { borderColor: 'rgba(239,68,68,0.2)' }]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>Unlink</Text>
                      </Pressable>
                    </View>
                    {enrollment.teller_accounts?.length > 0 && (
                      <View style={{ marginTop: 12, gap: 6 }}>
                        {enrollment.teller_accounts.map((acct: any) => (
                          <View key={acct.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[{ fontSize: 13, color: colors.textSecondary }]}>
                              {acct.account_name || acct.account_type || 'Account'} ••{acct.last_four || '****'}
                            </Text>
                            {acct.balance_available != null && (
                              <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }]}>
                                {formatCurrency(acct.balance_available)}
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                    {enrollment.last_synced_at && (
                      <Text style={[{ fontSize: 11, color: colors.textMuted, marginTop: 8 }]}>
                        Last synced: {new Date(enrollment.last_synced_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                ))}
                <Pressable
                  onPress={handleSyncAccounts}
                  style={[styles.syncBtn, { backgroundColor: `${brand.purple}1A`, borderColor: `${brand.purple}33` }]}
                >
                  <Text style={[{ fontSize: 14, fontWeight: '600', color: brand.purple }]}>Sync All Transactions</Text>
                </Pressable>
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/*  Help & FAQ Modal                                               */}
      {/* ============================================================ */}
      <Modal
        visible={helpVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHelpVisible(false)}
      >
        <View style={[styles.overlay, ]}>
          <View style={[styles.popupLarge, { backgroundColor: colors.base, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Help & FAQ</Text>
              <Pressable onPress={() => setHelpVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <FaqItem
              q="What is Kamioi?"
              a="Kamioi is a spare-change investing app that rounds up your everyday purchases and invests the difference into stocks aligned with the brands you buy from."
              colors={colors}
            />
            <FaqItem
              q="How do round-ups work?"
              a="When you make a purchase, Kamioi adds your chosen round-up amount — $1, $2, $3, or more — and invests it into stocks. For example, a $4.50 coffee with a $2 round-up setting invests $2.00."
              colors={colors}
            />
            <FaqItem
              q="How does receipt scanning work?"
              a="Take a photo of your receipt or upload one from your gallery. Our AI identifies the brands and items, then allocates your round-up investment across the matched stocks proportionally based on how much you spent at each brand."
              colors={colors}
            />
            <FaqItem
              q="Do I need my own API key?"
              a="Yes. Go to More > AI Provider to select your preferred AI service (DeepSeek, Claude, or OpenAI) and enter your API key. This key is used to process your receipt images."
              colors={colors}
            />
            <FaqItem
              q="How do I change my round-up amount?"
              a="Go to More > Round-Up Amount and select $1, $2, $3, or enter a custom amount."
              colors={colors}
            />
            <FaqItem
              q="Is my data secure?"
              a="Yes. All data is encrypted in transit and at rest. We use Supabase for secure authentication and data storage. Your API keys are stored securely and never shared."
              colors={colors}
            />
            <FaqItem
              q="How do I contact support?"
              a="Tap Contact Us in More > Support, or email us at support@kamioi.com."
              colors={colors}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
          </View>
        </View>
      </Modal>

      {/* In-App Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  )
}

/* ------------------------------------------------------------------ */
/*  FAQ Item                                                             */
/* ------------------------------------------------------------------ */

function FaqItem({ q, a, colors }: { q: string; a: string; colors: any }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={[styles.faqItem, { borderBottomColor: colors.borderSubtle }]}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: colors.textPrimary }]}>{q}</Text>
        <ChevronRight
          size={16}
          color={colors.textMuted}
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </View>
      {expanded && (
        <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{a}</Text>
      )}
    </Pressable>
  )
}

/* ------------------------------------------------------------------ */
/*  Setting Row                                                         */
/* ------------------------------------------------------------------ */

interface SettingRowProps {
  icon: typeof User
  iconColor: string
  iconBg: string
  label: string
  value?: string
  onPress?: () => void
  colors: any
  showBorder?: boolean
}

function SettingRow({ icon: Icon, iconColor, iconBg, label, value, onPress, colors, showBorder }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.settingsRow,
        showBorder && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
      ]}
    >
      <View style={[styles.iconSquare, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>{label}</Text>
      {value != null && (
        <Text style={[styles.settingsValue, { color: colors.textMuted }]}>{value}</Text>
      )}
      <ChevronRight size={16} color={colors.textMuted} />
    </Pressable>
  )
}

/* ------------------------------------------------------------------ */
/*  Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  profileCard: { marginBottom: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: 'white' },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileEmail: { fontSize: 13 },

  groupTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 },
  groupCard: { marginBottom: 24 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  iconSquare: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  settingsValue: { fontSize: 13, marginRight: 4 },

  version: { fontSize: 12, textAlign: 'center', marginBottom: 16 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },

  // Modal
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  popup: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  popupLarge: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { padding: 20 },
  addressRow: { flexDirection: 'row', gap: 12 },
  inputReadonly: { gap: 6 },
  inputReadonlyLabel: { fontSize: 13, fontWeight: '500' },
  inputReadonlyValue: { fontSize: 14, paddingVertical: 14, paddingHorizontal: 16 },

  // Picker
  pickerDesc: { fontSize: 13, marginBottom: 20 },
  pickerOptions: { gap: 10 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 12, borderWidth: 2,
  },
  pickerOptionText: { fontSize: 15, fontWeight: '600' },
  pickerOptionDesc: { fontSize: 12, marginTop: 2 },

  // Custom round-up
  customInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  customSetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customSetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // API Key
  apiKeySection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  apiKeyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  apiKeyDesc: { fontSize: 12, marginBottom: 12 },
  apiKeyRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  apiKeyInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  apiKeySaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  apiKeySaveBtnText: { fontSize: 14, fontWeight: '600', color: 'white' },
  apiKeyStatus: { fontSize: 12, fontWeight: '500', marginTop: 8 },

  // Linked Accounts
  linkedCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  linkedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlinkBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },

  // FAQ
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  faqQuestion: { fontSize: 15, fontWeight: '600', flex: 1 },
  faqAnswer: { fontSize: 14, lineHeight: 20, marginTop: 10 },
})
