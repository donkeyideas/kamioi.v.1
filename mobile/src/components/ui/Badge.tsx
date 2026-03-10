import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

type BadgeVariant = 'success' | 'warning' | 'info' | 'error' | 'purple'

interface BadgeProps {
  children: string
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' },
  error: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' },
  purple: { bg: 'rgba(124, 58, 237, 0.15)', text: '#7C3AED' },
}

export function Badge({ children, variant = 'info' }: BadgeProps) {
  const v = variantStyles[variant]
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.text }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '600' },
})
