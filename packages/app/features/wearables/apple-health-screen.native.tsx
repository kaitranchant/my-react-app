'use client'

import * as React from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'

import {
  LoginScreen,
  useMobileSession,
} from 'app/features/auth/login-screen.native'
import {
  getAppleHealthLastSyncedAt,
  isAppleHealthBackgroundSyncEnabled,
  runAppleHealthSync,
} from 'app/lib/apple-health/sync-engine.native'
import { startAppleHealthBackgroundSync } from 'app/lib/apple-health/background-sync.native'
import { isMobileConfigReady } from 'app/lib/mobile-config.native'

function formatRelativeSyncTime(date: Date): string {
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`
  }

  return date.toLocaleDateString()
}

export function AppleHealthScreen() {
  const { ready, signedIn, setSignedIn } = useMobileSession()
  const [pending, setPending] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null)
  const [backgroundEnabled, setBackgroundEnabled] = React.useState(false)

  React.useEffect(() => {
    if (!signedIn) return

    async function loadSyncState() {
      const [lastSynced, enabled] = await Promise.all([
        getAppleHealthLastSyncedAt(),
        isAppleHealthBackgroundSyncEnabled(),
      ])
      setLastSyncedAt(lastSynced)
      setBackgroundEnabled(enabled)
    }

    void loadSyncState()
  }, [signedIn])

  if (!isMobileConfigReady()) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Mobile app is not configured
        </Text>
        <Text style={{ color: '#666', lineHeight: 20 }}>
          Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and
          EXPO_PUBLIC_API_URL before using Apple Health sync.
        </Text>
      </View>
    )
  }

  if (Platform.OS !== 'ios') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          iPhone required
        </Text>
        <Text style={{ color: '#666', lineHeight: 20 }}>
          Apple Health sync is only available on iPhone through the Coaching App.
        </Text>
      </View>
    )
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!signedIn) {
    return <LoginScreen onSignedIn={() => setSignedIn(true)} />
  }

  async function handleSync() {
    setPending(true)
    setError(null)
    setStatus(null)

    try {
      const result = await runAppleHealthSync({ force: true, source: 'manual' })
      const syncedAt = await getAppleHealthLastSyncedAt()
      setLastSyncedAt(syncedAt)
      setBackgroundEnabled(true)
      await startAppleHealthBackgroundSync()
      setStatus(
        `Synced ${result.syncedDays} day${result.syncedDays === 1 ? '' : 's'} to your coach.`
      )
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'Apple Health sync failed.'
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Apple Health</Text>
      <Text style={{ color: '#666', lineHeight: 20 }}>
        Share steps, sleep, resting heart rate, and HRV from the last 14 days
        with your coach.
      </Text>
      {lastSyncedAt ? (
        <Text style={{ color: '#666', lineHeight: 20 }}>
          Last synced {formatRelativeSyncTime(lastSyncedAt)}.
        </Text>
      ) : null}
      {backgroundEnabled ? (
        <Text style={{ color: '#666', lineHeight: 20 }}>
          Background sync is on. New Health data will upload automatically when
          the app opens or iOS delivers HealthKit updates.
        </Text>
      ) : null}
      <Pressable
        disabled={pending}
        onPress={handleSync}
        style={{
          backgroundColor: '#111827',
          borderRadius: 10,
          paddingVertical: 14,
          alignItems: 'center',
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            Sync Apple Health
          </Text>
        )}
      </Pressable>
      {status ? <Text style={{ color: '#027a48' }}>{status}</Text> : null}
      {error ? <Text style={{ color: '#b42318' }}>{error}</Text> : null}
    </ScrollView>
  )
}
