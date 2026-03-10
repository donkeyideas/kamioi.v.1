import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, Link } from 'expo-router'
import { useTheme } from '@/theme/ThemeProvider'
import { supabase } from '@/lib/supabase'
import { Button, Input, AlertModal } from '@/components/ui'
import type { AlertButton } from '@/components/ui/AlertModal'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { colors, brand } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message?: string; buttons?: AlertButton[] }>({ visible: false, title: '' })
  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons })
  }, [])

  async function handleSendReset() {
    if (!email) {
      showAlert('Error', 'Please enter your email address.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      setSent(true)
      showAlert(
        'Check Your Email',
        'If an account exists for that email, a password reset link has been sent.',
      )
    } catch (err: any) {
      showAlert('Error', err?.message ?? 'Could not send reset email.')
    } finally {
      setLoading(false)
    }
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Text style={[styles.logoText, { color: brand.purple }]}>Kamioi</Text>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

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

          {/* Send Reset Link Button */}
          <Button onPress={handleSendReset} loading={loading} disabled={sent}>
            {sent ? 'Link Sent' : 'Send Reset Link'}
          </Button>

          {/* Back to Login */}
          <View style={styles.footer}>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={[styles.backLink, { color: brand.purple }]}>
                  Back to login
                </Text>
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
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  backLink: {
    fontSize: 14,
    fontWeight: '600',
  },
})
