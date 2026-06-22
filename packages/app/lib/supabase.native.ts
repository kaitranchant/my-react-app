import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import type { Database } from 'app/types/database'

import { getMobileConfig, isMobileConfigReady } from './mobile-config.native'

let client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  const config = getMobileConfig()
  if (!isMobileConfigReady(config)) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  if (!client) {
    client = createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }

  return client
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient()
  return supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
}

export async function signOut() {
  const supabase = getSupabaseClient()
  return supabase.auth.signOut()
}
