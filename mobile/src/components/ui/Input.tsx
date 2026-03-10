import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, type TextInputProps, type ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  containerStyle?: ViewStyle
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const { colors, brand, radius } = useTheme()
  const [focused, setFocused] = useState(false)

  return (
    <View style={containerStyle}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TextInput
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceInput,
            borderColor: focused ? brand.purple : error ? '#EF4444' : colors.borderSubtle,
            borderRadius: radius.xs,
            color: colors.textPrimary,
          },
          style,
        ]}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, fontSize: 15, minHeight: 48 },
  error: { fontSize: 12, color: '#EF4444', marginTop: 4 },
})
