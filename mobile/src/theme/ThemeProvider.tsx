import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { dark, light, brand, status, gradientColors, radius, type ThemeColors } from './tokens'

type ThemeMode = 'dark' | 'light'

interface ThemeContextValue {
  mode: ThemeMode
  colors: ThemeColors
  brand: typeof brand
  status: typeof status
  gradientColors: typeof gradientColors
  radius: typeof radius
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = '@kamioi_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'light' || stored === 'dark') setMode(stored)
    })
  }, [])

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode)
    AsyncStorage.setItem(STORAGE_KEY, newMode)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setTheme])

  const colors = mode === 'dark' ? dark : light

  return (
    <ThemeContext.Provider value={{ mode, colors, brand, status, gradientColors, radius, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
