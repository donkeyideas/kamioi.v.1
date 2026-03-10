import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/theme/ThemeProvider'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

const ONBOARDING_KEY = '@kamioi_onboarding_complete'

export default function Index() {
  const router = useRouter()
  const { colors } = useTheme()

  useEffect(() => {
    async function checkState() {
      // Splash delay for branding
      await new Promise(r => setTimeout(r, 2000))

      const onboarded = await AsyncStorage.getItem(ONBOARDING_KEY)
      if (!onboarded) {
        router.replace('/(onboarding)')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Check account type to route admin vs user
        const { data: profile } = await supabase
          .from('users')
          .select('account_type')
          .eq('auth_id', session.user.id)
          .single()

        if (profile?.account_type === 'admin') {
          router.replace('/(app)/(admin)')
        } else {
          router.replace('/(app)/(user)')
        }
        return
      }

      router.replace('/(auth)/login')
    }
    checkState()
  }, [router])

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <Text style={styles.logo}>Kamioi</Text>
      <Text style={[styles.tagline, { color: colors.textSecondary }]}>Invest Your Spare Change</Text>
      <View style={{ marginTop: 48 }}>
        <LoadingSpinner />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    color: '#7C3AED', // Fallback — gradient text requires special handling in RN
    marginBottom: 8,
  },
  tagline: { fontSize: 14, marginBottom: 48 },
})
