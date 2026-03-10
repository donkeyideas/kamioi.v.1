import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { GlassCard } from './GlassCard'
import { useTheme } from '@/theme/ThemeProvider'

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ icon, label, value, trend, trendDirection = 'neutral' }: KpiCardProps) {
  const { colors, status } = useTheme()

  const trendColor = trendDirection === 'up' ? status.success
    : trendDirection === 'down' ? status.error
    : colors.textSecondary

  return (
    <GlassCard padding={16} borderRadius={12}>
      <View style={styles.labelRow}>
        {icon}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      {trend && <Text style={[styles.trend, { color: trendColor }]}>{trend}</Text>}
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  label: { fontSize: 12 },
  value: { fontSize: 22, fontWeight: '700' },
  trend: { fontSize: 12, fontWeight: '600', marginTop: 4 },
})
