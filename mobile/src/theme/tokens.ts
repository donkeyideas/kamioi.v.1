// Brand colors
export const brand = {
  purple: '#7C3AED',
  blue: '#3B82F6',
  teal: '#06B6D4',
  pink: '#EC4899',
}

export const status = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
}

export const gradientColors = ['#7C3AED', '#3B82F6', '#06B6D4'] as const

export const radius = {
  default: 16,
  sm: 12,
  xs: 8,
  full: 99,
}

export const dark = {
  base: '#0F0B1A',
  card: 'rgba(15, 11, 26, 0.6)',
  cardSolid: 'rgba(15, 11, 26, 0.85)',
  textPrimary: '#F8FAFC',
  textSecondary: 'rgba(248, 250, 252, 0.6)',
  textMuted: 'rgba(248, 250, 252, 0.4)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  surfaceInput: 'rgba(255, 255, 255, 0.06)',
  surfaceHover: 'rgba(255, 255, 255, 0.1)',
}

export const light = {
  base: '#F8FAFC',
  card: 'rgba(255, 255, 255, 0.7)',
  cardSolid: 'rgba(255, 255, 255, 0.9)',
  textPrimary: '#1E293B',
  textSecondary: 'rgba(30, 41, 59, 0.65)',
  textMuted: 'rgba(30, 41, 59, 0.45)',
  borderSubtle: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.1)',
  surfaceInput: 'rgba(0, 0, 0, 0.04)',
  surfaceHover: 'rgba(0, 0, 0, 0.06)',
}

// Export a type for the theme colors
export type ThemeColors = typeof dark
