import React, { useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Dimensions,
  type ViewToken,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Coins, ScanLine, BarChart3, Rocket, ChevronRight } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { Button } from '@/components/ui'

const ONBOARDING_KEY = '@kamioi_onboarding_complete'
const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface SlideData {
  id: string
  Icon: typeof Coins
  iconBg: 'purple' | 'blue' | 'teal' | 'gradient'
  title: string
  description: string
}

const SLIDES: SlideData[] = [
  {
    id: '0',
    Icon: Coins,
    iconBg: 'purple',
    title: 'Invest Your\nSpare Change',
    description:
      'Choose a round-up amount — $1, $2, $3, or more. Every purchase automatically invests that amount in stocks you love.',
  },
  {
    id: '1',
    Icon: ScanLine,
    iconBg: 'blue',
    title: 'AI-Powered\nAllocation',
    description:
      'Our AI maps your merchants to their stock tickers. Shop at Apple? Your round-ups invest in AAPL.',
  },
  {
    id: '2',
    Icon: BarChart3,
    iconBg: 'teal',
    title: 'Track\nEverything',
    description:
      'Monitor your portfolio, set savings goals, and watch your wealth grow from everyday spending.',
  },
  {
    id: '3',
    Icon: Rocket,
    iconBg: 'gradient',
    title: 'Ready to\nGet Started?',
    description:
      'Join thousands of investors turning everyday purchases into real wealth.',
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const { colors, brand, gradientColors, radius } = useTheme()
  const flatListRef = useRef<FlatList>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index)
      }
    },
    [],
  )

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  async function completeOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace('/(auth)/login')
  }

  function handleSkip() {
    completeOnboarding()
  }

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true })
    }
  }

  function goToSlide(index: number) {
    flatListRef.current?.scrollToIndex({ index, animated: true })
  }

  function getIconBgStyle(type: SlideData['iconBg']) {
    switch (type) {
      case 'purple':
        return { backgroundColor: 'rgba(124, 58, 237, 0.15)' }
      case 'blue':
        return { backgroundColor: 'rgba(59, 130, 246, 0.15)' }
      case 'teal':
        return { backgroundColor: 'rgba(6, 182, 212, 0.15)' }
      case 'gradient':
        return null // handled with LinearGradient
    }
  }

  function getIconColor(type: SlideData['iconBg']) {
    switch (type) {
      case 'purple':
        return brand.purple
      case 'blue':
        return brand.blue
      case 'teal':
        return brand.teal
      case 'gradient':
        return 'white'
    }
  }

  const isLastSlide = activeIndex === SLIDES.length - 1

  function renderSlide({ item }: { item: SlideData }) {
    const { Icon, iconBg, title, description, id } = item
    const bgStyle = getIconBgStyle(iconBg)
    const iconColor = getIconColor(iconBg)
    const isLast = id === '3'

    return (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        {/* Icon Container */}
        {iconBg === 'gradient' ? (
          <LinearGradient
            colors={[...gradientColors]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Icon size={44} color={iconColor} />
          </LinearGradient>
        ) : (
          <View style={[styles.iconContainer, bgStyle]}>
            <Icon size={44} color={iconColor} />
          </View>
        )}

        {/* Title */}
        <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>{title}</Text>

        {/* Description */}
        <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>{description}</Text>

        {/* CTA buttons on last slide */}
        {isLast && (
          <View style={styles.ctaContainer}>
            <Button onPress={() => completeOnboarding()} style={{ maxWidth: 240 }}>
              Create Account
            </Button>
            <Button
              variant="secondary"
              onPress={() => completeOnboarding()}
              style={{ maxWidth: 240 }}
            >
              Log In
            </Button>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Aurora blob effects */}
      <View style={styles.auroraContainer} pointerEvents="none">
        <View style={[styles.blob, styles.blobPurple, { opacity: 0.5 }]} />
        <View style={[styles.blob, styles.blobBlue, { opacity: 0.5 }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerLogo, { color: brand.purple }]}>Kamioi</Text>
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        bounces={false}
      />

      {/* Footer */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, index) => {
            const isActive = index === activeIndex
            return (
              <Pressable key={index} onPress={() => goToSlide(index)}>
                {isActive ? (
                  <LinearGradient
                    colors={[...gradientColors]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.dot, styles.dotActive]}
                  />
                ) : (
                  <View
                    style={[styles.dot, { backgroundColor: colors.borderLight }]}
                  />
                )}
              </Pressable>
            )
          })}
        </View>

        {/* Next Button (hidden on last slide) */}
        {!isLastSlide && (
          <View style={styles.nextBtnWrapper}>
            <Button onPress={handleNext} icon={<ChevronRight size={18} color="white" />}>
              Next
            </Button>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  auroraContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobPurple: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    top: -80,
    left: -80,
  },
  blobBlue: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    top: '40%',
    right: -100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 0,
    zIndex: 1,
  },
  headerLogo: {
    fontSize: 18,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
  },
  flatList: {
    flex: 1,
    zIndex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
  },
  slideDesc: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 280,
  },
  ctaContainer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  footer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 40,
    zIndex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  nextBtnWrapper: {
    width: 200,
  },
})
