'use client'

import * as React from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'

import { getAccessToken, signInWithPassword } from 'app/lib/supabase.native'

type LoginScreenProps = {
  onSignedIn: () => void
}

export function LoginScreen({ onSignedIn }: LoginScreenProps) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit() {
    setPending(true)
    setError(null)

    const { error: signInError } = await signInWithPassword(email, password)
    setPending(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    onSignedIn()
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        gap: 16,
        backgroundColor: '#fff',
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Sign in</Text>
      <Text style={{ color: '#666', lineHeight: 20 }}>
        Use the same email and password as your coaching portal account.
      </Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        }}
      />
      <TextInput
        secureTextEntry
        autoComplete="password"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === 'ios' ? 14 : 10,
        }}
      />
      {error ? <Text style={{ color: '#b42318' }}>{error}</Text> : null}
      <Pressable
        disabled={pending}
        onPress={handleSubmit}
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
          <Text style={{ color: '#fff', fontWeight: '600' }}>Continue</Text>
        )}
      </Pressable>
    </View>
  )
}

export function useMobileSession() {
  const [ready, setReady] = React.useState(false)
  const [signedIn, setSignedIn] = React.useState(false)

  React.useEffect(() => {
    let active = true

    async function loadSession() {
      const token = await getAccessToken()
      if (!active) return
      setSignedIn(Boolean(token))
      setReady(true)
    }

    loadSession()
    return () => {
      active = false
    }
  }, [])

  return { ready, signedIn, setSignedIn }
}
