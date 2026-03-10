import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { useRouter, Link } from 'expo-router'
import { User, Users, Building } from 'lucide-react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { Button, Input, AlertModal } from '@/components/ui'
import type { AlertButton } from '@/components/ui/AlertModal'

const ACCOUNT_TYPES = [
  { key: 'individual', label: 'Individual', Icon: User },
  { key: 'family', label: 'Family', Icon: Users },
  { key: 'business', label: 'Business', Icon: Building },
] as const

export default function RegisterScreen() {
  const router = useRouter()
  const { colors, brand, radius } = useTheme()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState<string>('individual')
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [loading, setLoading] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message?: string; buttons?: AlertButton[] }>({ visible: false, title: '' })
  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }, [])

  async function handleGoogleSignUp() {
    try {
      const redirectUrl = Linking.createURL('auth/callback')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      })
      if (error) throw error
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        if (result.type === 'success' && result.url) {
          const url = result.url
          const params = new URLSearchParams(url.split('#')[1] || '')
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            router.replace('/(app)/(user)')
          }
        }
      }
    } catch (err: any) {
      showAlert('Google Sign Up Failed', err?.message ?? 'Could not sign up with Google. Make sure Google OAuth is enabled in your Supabase project.')
    }
  }

  async function handleCreateAccount() {
    if (!fullName || !email || !password) {
      showAlert('Error', 'Please fill in all fields.')
      return
    }
    if (!termsAccepted) {
      showAlert('Error', 'Please accept the Terms of Service and Privacy Policy.')
      return
    }
    setLoading(true)
    try {
      await useAuthStore.getState().signUp(email, password, fullName, accountType)
      router.replace('/(app)/(user)')
    } catch (err: any) {
      showAlert('Registration Failed', err?.message ?? 'Could not create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Aurora blob effects */}
      <View style={styles.auroraContainer} pointerEvents="none">
        <View style={[styles.blob, styles.blobPurple, { opacity: 0.5 }]} />
        <View style={[styles.blob, styles.blobTeal, { opacity: 0.5 }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Text style={[styles.logoText, { color: brand.purple }]}>Kamioi</Text>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Start investing your spare change
          </Text>

          {/* Full Name */}
          <View style={styles.formGroup}>
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.formGroup}>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.formGroup}>
            <Input
              label="Password"
              placeholder="Min 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Account Type */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Account Type</Text>
          <View style={styles.accountTypeGrid}>
            {ACCOUNT_TYPES.map(({ key, label, Icon }) => {
              const selected = accountType === key
              return (
                <Pressable
                  key={key}
                  onPress={() => setAccountType(key)}
                  style={[
                    styles.accountTypeBtn,
                    {
                      backgroundColor: selected
                        ? 'rgba(124, 58, 237, 0.1)'
                        : colors.surfaceInput,
                      borderColor: selected ? brand.purple : colors.borderSubtle,
                      borderRadius: radius.xs,
                    },
                  ]}
                >
                  <Icon
                    size={22}
                    color={selected ? brand.purple : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.accountTypeLabel,
                      { color: selected ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* Terms */}
          <Pressable
            style={styles.termsRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: termsAccepted ? brand.purple : colors.borderSubtle,
                  backgroundColor: termsAccepted ? brand.purple : 'transparent',
                },
              ]}
            >
              {termsAccepted && (
                <Text style={styles.checkmark}>&#10003;</Text>
              )}
            </View>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I agree to the{' '}
              <Text style={{ color: brand.purple }}>Terms of Service</Text> and{' '}
              <Text style={{ color: brand.purple }}>Privacy Policy</Text>
            </Text>
          </Pressable>

          {/* Create Account Button */}
          <Button onPress={handleCreateAccount} loading={loading}>
            Create Account
          </Button>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>
              or sign up with
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            <View style={{ flex: 1 }}>
              <Button variant="social" onPress={handleGoogleSignUp} icon={<GoogleIcon />}>
                Sign up with Google
              </Button>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: brand.purple }]}>Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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

function GoogleIcon() {
  return (
    <Image
      source={{ uri: 'https://www.google.com/favicon.ico' }}
      style={{ width: 20, height: 20 }}
      resizeMode="contain"
    />
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  auroraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobPurple: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    top: -80,
    left: -80,
  },
  blobTeal: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    bottom: -40,
    left: '20%',
  },
  scrollContent: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  accountTypeGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  accountTypeBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 2,
  },
  accountTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkmark: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  termsText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
})
