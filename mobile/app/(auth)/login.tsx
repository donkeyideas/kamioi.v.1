import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native'
import { useRouter, Link } from 'expo-router'
import { Shield } from 'lucide-react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { Button, Input, AlertModal } from '@/components/ui'
import type { AlertButton } from '@/components/ui/AlertModal'

export default function LoginScreen() {
  const router = useRouter()
  const { colors, brand, radius } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [signinEnabled, setSigninEnabled] = useState(true)
  const [signupEnabled, setSignupEnabled] = useState(true)
  const [demoMode, setDemoMode] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const fadeAnim = useState(() => new Animated.Value(0))[0]
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message?: string; buttons?: AlertButton[] }>({ visible: false, title: '' })
  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }, [])

  // Fetch admin settings on mount (same as web Login.tsx)
  useEffect(() => {
    supabase.from('admin_settings').select('setting_key, setting_value')
      .in('setting_key', ['signin_enabled', 'signup_enabled', 'demo_mode'])
      .then(({ data }) => {
        data?.forEach((s) => {
          if (s.setting_key === 'signin_enabled') setSigninEnabled(s.setting_value !== 'false')
          if (s.setting_key === 'signup_enabled') setSignupEnabled(s.setting_value !== 'false')
          if (s.setting_key === 'demo_mode') setDemoMode(s.setting_value === 'true')
        })
        setSettingsLoaded(true)
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      })
  }, [])

  async function handleSignIn() {
    if (!signinEnabled) {
      showAlert('Error', 'Sign-in is currently disabled by the administrator.')
      return
    }
    if (!email || !password) {
      showAlert('Error', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    try {
      await useAuthStore.getState().signIn(email, password)
      // Explicitly fetch profile to determine admin status
      // (onAuthStateChange listener may not be registered yet from login screen)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await useAuthStore.getState().fetchProfile(user.id)
      }
      const store = useAuthStore.getState()
      if (store.isAdmin) {
        router.replace('/(app)/(admin)')
      } else {
        router.replace('/(app)/(user)')
      }
    } catch (err: any) {
      showAlert('Sign In Failed', err?.message ?? 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
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
            // Fetch profile to check admin status
            await useAuthStore.getState().fetchProfile(
              (await supabase.auth.getUser()).data.user?.id ?? ''
            )
            const store = useAuthStore.getState()
            if (store.isAdmin) {
              router.replace('/(app)/(admin)')
            } else {
              router.replace('/(app)/(user)')
            }
          }
        }
      }
    } catch (err: any) {
      showAlert('Google Sign In Failed', err?.message ?? 'Could not sign in with Google. Make sure Google OAuth is enabled in your Supabase project.')
    }
  }

  async function handleBiometricLogin() {
    try {
      const LocalAuth = await import('expo-local-authentication')
      const compatible = await LocalAuth.hasHardwareAsync()
      if (!compatible) {
        showAlert('Not Available', 'Biometric authentication is not available on this device.')
        return
      }
      const result = await LocalAuth.authenticateAsync({
        promptMessage: 'Sign in with biometrics',
        fallbackLabel: 'Use passcode',
      })
      if (result.success) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Fetch profile to check admin status
          await useAuthStore.getState().fetchProfile(session.user.id)
          const store = useAuthStore.getState()
          if (store.isAdmin) {
            router.replace('/(app)/(admin)')
          } else {
            router.replace('/(app)/(user)')
          }
        } else {
          showAlert('No Session', 'Please sign in with email first, then enable biometric unlock in Settings.')
        }
      }
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Biometric authentication failed.')
    }
  }

  function handleTryDemo() {
    router.push('/(demo)')
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Aurora blob effects */}
      <View style={styles.auroraContainer} pointerEvents="none">
        <View style={[styles.blob, styles.blobPurple, { opacity: 0.5 }]} />
        <View style={[styles.blob, styles.blobBlue, { opacity: 0.5 }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <Text style={[styles.logoText, { color: brand.purple }]}>Kamioi</Text>

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {signinEnabled ? 'Sign in to your account' : 'Welcome to Kamioi'}
            </Text>

            {/* Sign-in disabled message */}
            {!signinEnabled && !demoMode && (
              <View style={[styles.disabledCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.disabledText, { color: colors.textSecondary }]}>
                  Sign-in is currently unavailable. Please try again later.
                </Text>
              </View>
            )}

            {signinEnabled && (
              <>
                {/* Email Input */}
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

                {/* Password Input */}
                <View style={styles.formGroup}>
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                {/* Forgot Password */}
                <Link href="/(auth)/forgot-password" asChild>
                  <Pressable style={styles.forgotRow}>
                    <Text style={[styles.forgotText, { color: colors.textSecondary }]}>
                      Forgot password?
                    </Text>
                  </Pressable>
                </Link>

                {/* Sign In Button */}
                <Button onPress={handleSignIn} loading={loading}>
                  Sign In
                </Button>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
                  <Text style={[styles.dividerText, { color: colors.textMuted }]}>
                    or continue with
                  </Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
                </View>

                {/* Social Buttons */}
                <View style={styles.socialRow}>
                  <View style={{ flex: 1 }}>
                    <Button variant="social" onPress={handleGoogleSignIn} icon={<GoogleIcon />}>
                      Sign in with Google
                    </Button>
                  </View>
                </View>

                {/* Biometric Button */}
                <Pressable
                  style={[
                    styles.biometricBtn,
                    {
                      backgroundColor: 'rgba(124,58,237,0.1)',
                      borderColor: 'rgba(124,58,237,0.2)',
                      borderRadius: radius.sm,
                    },
                  ]}
                  onPress={handleBiometricLogin}
                >
                  <Shield size={20} color={brand.purple} />
                  <Text style={[styles.biometricText, { color: brand.purple }]}>Use Face ID</Text>
                </Pressable>
              </>
            )}

            {/* Demo Mode Button */}
            {demoMode && (
              <View style={[styles.demoCard, { backgroundColor: colors.card, borderColor: 'rgba(124,58,237,0.3)' }]}>
                <Text style={[styles.demoLabel, { color: colors.textSecondary }]}>
                  Want to explore first?
                </Text>
                <Pressable
                  style={[styles.demoBtn, { borderColor: 'rgba(124,58,237,0.3)' }]}
                  onPress={handleTryDemo}
                >
                  <Text style={[styles.demoBtnText, { color: '#A78BFA' }]}>
                    Try Interactive Demo
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Footer */}
            {signinEnabled && signupEnabled && (
              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  Don't have an account?{' '}
                </Text>
                <Link href="/(auth)/register" asChild>
                  <Pressable>
                    <Text style={[styles.footerLink, { color: brand.purple }]}>Sign Up</Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </ScrollView>
        </Animated.View>
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
  blobBlue: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    top: '40%',
    right: -100,
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
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 13,
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
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabledCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  disabledText: {
    fontSize: 14,
    textAlign: 'center',
  },
  demoCard: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  demoLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  demoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  demoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
})
