import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native'
import { useRouter } from 'expo-router'
import { User, Users, Briefcase } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { Button, Input, AlertModal } from '@/components/ui'
import type { AlertButton } from '@/components/ui/AlertModal'
import { getDemoSession, setDemoSession, type DemoSession } from '@/demo/demoSession'
import { validateDemoCode, logDemoVisit } from '@/demo/demoApi'

const CARDS = [
  { key: 'individual', title: 'Individual', subtitle: 'Personal micro-investing', color: '#7C3AED', Icon: User },
  { key: 'family', title: 'Family', subtitle: 'Shared family investing', color: '#3B82F6', Icon: Users },
  { key: 'business', title: 'Business', subtitle: 'Corporate investing', color: '#06B6D4', Icon: Briefcase },
] as const

export default function DemoGateScreen() {
  const router = useRouter()
  const { colors, brand, radius } = useTheme()
  const [session, setSession] = useState<DemoSession | null>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const fadeAnim = useState(() => new Animated.Value(0))[0]
  const [alertConfig, setAlertConfig] = useState<{ visible: boolean; title: string; message?: string; buttons?: AlertButton[] }>({ visible: false, title: '' })

  useEffect(() => {
    getDemoSession().then(s => {
      setSession(s)
      setChecking(false)
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      if (s) {
        logDemoVisit(s.session_token, s.email, 'selector')
      }
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !code.trim()) {
      setError('Please enter both email and demo code.')
      return
    }
    setError('')
    setLoading(true)

    const { data, error: apiErr } = await validateDemoCode(code.trim(), email.trim())

    if (apiErr || !data) {
      setError(apiErr || 'Failed to validate demo code')
      setLoading(false)
      return
    }

    await setDemoSession(data)
    setSession(data)
    setLoading(false)
  }, [email, code])

  const handleSelectDemo = useCallback((type: string) => {
    if (session) {
      logDemoVisit(session.session_token, session.email, type)
    }
    router.push({ pathname: '/(demo)/dashboard', params: { type } })
  }, [session, router])

  if (checking) return null

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Background blobs */}
      <View style={styles.auroraContainer} pointerEvents="none">
        <View style={[styles.blob, { backgroundColor: 'rgba(124,58,237,0.2)', top: -80, left: -80, width: 300, height: 300 }]} />
        <View style={[styles.blob, { backgroundColor: 'rgba(6,182,212,0.15)', bottom: 50, right: -100, width: 250, height: 250 }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Text style={[styles.logoText, { color: brand.purple }]}>Kamioi</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {session ? 'Try Kamioi Demo' : 'Access Demo'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {session
                ? 'Explore our interactive dashboards with sample data.'
                : 'Enter your demo code and email to explore.'}
            </Text>

            {!session ? (
              /* ---- Gate Form ---- */
              <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}>
                <View style={styles.formGroup}>
                  <Input
                    label="Email Address"
                    placeholder="you@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Input
                    label="Demo Code"
                    placeholder="DEMO-XXXXXX"
                    value={code}
                    onChangeText={t => setCode(t.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Button onPress={handleSubmit} loading={loading}>
                  Access Demo
                </Button>
              </View>
            ) : (
              /* ---- Dashboard Selector ---- */
              <View style={styles.cardsWrap}>
                {CARDS.map(card => (
                  <Pressable
                    key={card.key}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
                    onPress={() => handleSelectDemo(card.key)}
                  >
                    <View style={[styles.cardIcon, { backgroundColor: card.color + '22' }]}>
                      <card.Icon size={28} color={card.color} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.cardTitle, { color: card.color }]}>{card.title}</Text>
                    <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{card.subtitle}</Text>
                    <View style={[styles.launchBtn, { backgroundColor: card.color + '15', borderColor: card.color + '44' }]}>
                      <Text style={[styles.launchText, { color: card.color }]}>Launch Demo</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable onPress={() => router.back()}>
                <Text style={[styles.footerLink, { color: brand.purple }]}>Back to Login</Text>
              </Pressable>
            </View>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  auroraContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 0 },
  blob: { position: 'absolute', borderRadius: 999 },
  scrollContent: { paddingTop: 70, paddingHorizontal: 24, paddingBottom: 40 },
  logoText: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 32, lineHeight: 20, paddingHorizontal: 20 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 24, marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  errorBox: { padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginBottom: 16 },
  errorText: { color: '#EF4444', fontSize: 13 },
  cardsWrap: { gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center' },
  cardIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 13, marginBottom: 16 },
  launchBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1 },
  launchText: { fontSize: 14, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerLink: { fontSize: 14, fontWeight: '600' },
})
