import Constants from 'expo-constants'

type MobileConfig = {
  supabaseUrl: string
  supabaseAnonKey: string
  apiUrl: string
}

function readExtra(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
  return extra?.[key]?.trim() || undefined
}

export function getMobileConfig(): MobileConfig {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    readExtra('supabaseUrl') ||
    ''
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    readExtra('supabaseAnonKey') ||
    ''
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    readExtra('apiUrl') ||
    'http://localhost:3000'

  return { supabaseUrl, supabaseAnonKey, apiUrl }
}

export function isMobileConfigReady(config: MobileConfig = getMobileConfig()) {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey)
}
