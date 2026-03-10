import React from 'react'
import { Pressable, Text, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '@/theme/ThemeProvider'

type ButtonVariant = 'primary' | 'secondary' | 'social' | 'ghost' | 'danger'

interface ButtonProps {
  children: string
  onPress?: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  style?: ViewStyle
}

export function Button({ children, onPress, variant = 'primary', loading, disabled, icon, style }: ButtonProps) {
  const { colors, radius } = useTheme()
  const isDisabled = disabled || loading

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[styles.btn, style]}>
        <LinearGradient
          colors={isDisabled ? ['rgba(124,58,237,0.5)', 'rgba(59,130,246,0.5)'] : ['#7C3AED', '#3B82F6', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: radius.sm }]}
        >
          {loading ? <ActivityIndicator color="white" size="small" /> : (
            <>
              {icon}
              <Text style={styles.primaryText}>{children}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    )
  }

  const variantStyle = variant === 'secondary'
    ? { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle, borderWidth: 1 }
    : variant === 'social'
    ? { backgroundColor: colors.surfaceInput, borderColor: colors.borderSubtle, borderWidth: 1 }
    : variant === 'ghost'
    ? { backgroundColor: 'transparent' }
    : variant === 'danger'
    ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1 }
    : {}

  const textColor = variant === 'ghost' ? colors.textSecondary
    : variant === 'danger' ? '#EF4444'
    : colors.textPrimary

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.btn, styles.nonGradientBtn, variantStyle, { borderRadius: radius.sm, opacity: isDisabled ? 0.5 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={textColor} size="small" /> : (
        <>
          {icon}
          <Text style={[styles.btnText, { color: textColor }]}>{children}</Text>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: { width: '100%' },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '600' },
  nonGradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  btnText: { fontSize: 15, fontWeight: '600' },
})
