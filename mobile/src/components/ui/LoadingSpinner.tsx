import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated'
import { useTheme } from '@/theme/ThemeProvider'

export function LoadingSpinner({ size = 32 }: { size?: number }) {
  const { colors, brand } = useTheme()
  const rotation = useSharedValue(0)

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false)
  }, [rotation])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }))

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: colors.borderSubtle,
          borderTopColor: brand.purple,
        },
        animatedStyle,
      ]}
    />
  )
}
