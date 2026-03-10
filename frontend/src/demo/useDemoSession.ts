const STORAGE_KEY = 'kamioi_demo_session'

export interface DemoSession {
  session_token: string
  email: string
  valid_until: string
}

export function getDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const session: DemoSession = JSON.parse(raw)

    // Check expiry
    if (new Date(session.valid_until) < new Date()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function setDemoSession(session: DemoSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearDemoSession(): void {
  localStorage.removeItem(STORAGE_KEY)
}
