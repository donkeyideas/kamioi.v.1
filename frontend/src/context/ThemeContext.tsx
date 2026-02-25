import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type ThemeMode = 'dark' | 'light' | 'green'

interface ThemeContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  isDark: boolean
  isLight: boolean
  isGreen: boolean
}

const THEME_ORDER: ThemeMode[] = ['dark', 'light', 'green']

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('kamioi_theme')
    return (stored === 'light' || stored === 'dark' || stored === 'green') ? stored : 'dark'
  })

  useEffect(() => {
    localStorage.setItem('kamioi_theme', theme)
    document.body.classList.remove('light-mode', 'green-mode')
    if (theme === 'light') document.body.classList.add('light-mode')
    if (theme === 'green') document.body.classList.add('green-mode')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const idx = THEME_ORDER.indexOf(prev)
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length]
    })
  }, [])

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
      isGreen: theme === 'green',
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
