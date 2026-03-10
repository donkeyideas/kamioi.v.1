import React from 'react'
import { Tabs } from 'expo-router'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { LayoutDashboard, Users, TrendingUp, CreditCard, Settings } from 'lucide-react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TAB_CONFIG = [
  { name: 'index', label: 'Overview', Icon: LayoutDashboard },
  { name: 'users', label: 'Users', Icon: Users },
  { name: 'investments', label: 'Invest', Icon: TrendingUp },
  { name: 'transactions', label: 'Txns', Icon: CreditCard },
  { name: 'settings', label: 'Settings', Icon: Settings },
] as const

function AdminTabBar({ state, navigation }: any) {
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
                colors={['#F59E0B', '#EF4444', '#7C3AED']}
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

export default function AdminLayout() {
  return (
    <Tabs
      tabBar={(props) => <AdminTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="users" />
      <Tabs.Screen name="investments" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="settings" />
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
