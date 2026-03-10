import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'kamioi_demo_session'

export interface DemoSession {
  session_token: string
  email: string
  valid_until: string
}

export async function getDemoSession(): Promise<DemoSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const session: DemoSession = JSON.parse(raw)

    if (new Date(session.valid_until) < new Date()) {
      await AsyncStorage.removeItem(STORAGE_KEY)
      return null
    }

    return session
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export async function setDemoSession(session: DemoSession): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export async function clearDemoSession(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY)
}
