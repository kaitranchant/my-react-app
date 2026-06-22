import { AppState, Platform } from 'react-native'
import {
  configureBackgroundTypes,
  subscribeToChanges,
  UpdateFrequency,
} from '@kingstinct/react-native-healthkit'
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'

import { isMobileConfigReady } from '../mobile-config.native'
import { getAccessToken } from '../supabase.native'
import {
  isAppleHealthBackgroundSyncEnabled,
  runAppleHealthBackgroundSync,
} from './sync-engine.native'

const BACKGROUND_FETCH_TASK = 'coaching-app-apple-health-sync'

const HEALTHKIT_BACKGROUND_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const

let cleanupListeners: (() => void) | null = null

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const result = await runAppleHealthBackgroundSync('background-fetch')
  return result
    ? BackgroundFetch.BackgroundFetchResult.NewData
    : BackgroundFetch.BackgroundFetchResult.NoData
})

async function registerBackgroundFetchTask(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync()
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_FETCH_TASK
  )
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    })
  }
}

async function configureHealthKitBackgroundDelivery(): Promise<() => void> {
  await configureBackgroundTypes(
    [...HEALTHKIT_BACKGROUND_TYPES],
    UpdateFrequency.hourly
  )

  const subscriptions = HEALTHKIT_BACKGROUND_TYPES.map((typeIdentifier) =>
    subscribeToChanges(typeIdentifier, () => {
      void runAppleHealthBackgroundSync('healthkit-change')
    })
  )

  return () => {
    for (const subscription of subscriptions) {
      subscription.remove()
    }
  }
}

export function stopAppleHealthBackgroundSync(): void {
  cleanupListeners?.()
  cleanupListeners = null
}

export async function startAppleHealthBackgroundSync(): Promise<() => void> {
  stopAppleHealthBackgroundSync()

  if (Platform.OS !== 'ios' || !isMobileConfigReady()) {
    return () => {}
  }

  const accessToken = await getAccessToken()
  if (!accessToken) {
    return () => {}
  }

  if (!(await isAppleHealthBackgroundSyncEnabled())) {
    return () => {}
  }

  try {
    const removeHealthKitListeners = await configureHealthKitBackgroundDelivery()
    await registerBackgroundFetchTask()

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runAppleHealthBackgroundSync('foreground')
      }
    })

    cleanupListeners = () => {
      removeHealthKitListeners()
      appStateSubscription.remove()
      cleanupListeners = null
    }

    void runAppleHealthBackgroundSync('foreground')

    return cleanupListeners
  } catch {
    return () => {}
  }
}
