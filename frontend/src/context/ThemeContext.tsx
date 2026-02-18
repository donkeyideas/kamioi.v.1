import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type ThemeMode = 'dark' | 'light'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  isDark: boolean
  isLight: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('kamioi_theme')
    return (stored === 'light' || stored === 'dark') ? stored : 'dark'
  })

  useEffect(() => {
    localStorage.setItem('kamioi_theme', theme)
    document.body.classList.toggle('light-mode', theme === 'light')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
