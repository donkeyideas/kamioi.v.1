import React from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'

interface CompanyLogoProps {
  domain: string
  size?: number
  imageSize?: number
}

export function CompanyLogo({ domain, size = 40, imageSize = 28 }: CompanyLogoProps) {
  const { colors } = useTheme()
  const url = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: 10, backgroundColor: colors.surfaceInput }]}>
      <Image source={{ uri: url }} style={{ width: imageSize, height: imageSize, borderRadius: 4 }} resizeMode="contain" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
})
