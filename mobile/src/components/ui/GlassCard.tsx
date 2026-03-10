import React from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '@/theme/ThemeProvider'

interface GlassCardProps {
  children: React.ReactNode
  style?: ViewStyle
  padding?: number
  borderRadius?: number
}

export function GlassCard({ children, style, padding = 20, borderRadius }: GlassCardProps) {
  const { colors, radius } = useTheme()
  const r = borderRadius ?? radius.default

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderRadius: r, borderColor: colors.borderSubtle, padding }, style]}>
      <LinearGradient
        colors={['transparent', colors.borderLight, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.topHighlight, { borderTopLeftRadius: r, borderTopRightRadius: r }]}
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
})
