import React from 'react'
import { Tabs } from 'expo-router'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Home, TrendingUp, CreditCard, Lightbulb, MoreVertical } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TAB_CONFIG = [
  { name: 'index', label: 'Home', Icon: Home },
  { name: 'portfolio', label: 'Portfolio', Icon: TrendingUp },
  { name: 'transactions', label: 'Activity', Icon: CreditCard },
  { name: 'insights', label: 'Insights', Icon: Lightbulb },
  { name: 'more', label: 'More', Icon: MoreVertical },
] as const

function CustomTabBar({ state, navigation }: any) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.base,
          borderTopColor: colors.borderSubtle,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      {TAB_CONFIG.map((tab, i) => {
        const isActive = state.index === i
        return (
          <Pressable
            key={tab.name}
            onPress={() => navigation.navigate(tab.name)}
            style={styles.tabBtn}
          >
            {isActive && (
              <LinearGradient
                colors={['#7C3AED', '#3B82F6', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.activeIndicator}
              />
            )}
            <tab.Icon
              size={22}
              color={isActive ? colors.textPrimary : colors.textMuted}
              strokeWidth={isActive ? 2 : 1.5}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.textPrimary : colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function UserLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="portfolio" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="more" />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingHorizontal: 8,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 56,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
})
