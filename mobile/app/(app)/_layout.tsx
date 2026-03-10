import React, { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { View, ActivityIndicator } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

export default function AppLayout() {
  const { user, loading, initialized } = useAuth()
  const router = useRouter()
  const { colors } = useTheme()

  useEffect(() => {
    if (initialized && !loading && !user) {
      router.replace('/(auth)/login')
    }
  }, [initialized, loading, user])

  if (!initialized || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.base }}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
