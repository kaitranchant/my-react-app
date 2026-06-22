export type WhoopTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
  token_type: string
}

export type WhoopProfile = {
  user_id: number
  email: string
  first_name: string
  last_name: string
}

export type WhoopPaginated<T> = {
  records: T[]
  next_token?: string | null
}

export type WhoopRecoveryRecord = {
  cycle_id: number
  sleep_id: string
  user_id: number
  created_at: string
  updated_at: string
  score_state: string
  score: {
    user_calibrating?: boolean
    recovery_score?: number
    resting_heart_rate?: number
    hrv_rmssd_milli?: number
    spo2_percentage?: number
    skin_temp_celsius?: number
  } | null
}

export type WhoopCycleRecord = {
  id: number
  user_id: number
  created_at: string
  updated_at: string
  start: string
  end: string
  timezone_offset: string
  score_state: string
  score: {
    strain?: number
    kilojoule?: number
    average_heart_rate?: number
    max_heart_rate?: number
  } | null
}

export type WhoopSleepRecord = {
  id: string
  cycle_id: number
  user_id: number
  created_at: string
  updated_at: string
  start: string
  end: string
  timezone_offset: string
  nap: boolean
  score_state: string
  score: {
    stage_summary?: {
      total_in_bed_time_milli?: number
      total_awake_time_milli?: number
      total_no_data_time_milli?: number
      total_light_sleep_time_milli?: number
      total_slow_wave_sleep_time_milli?: number
      total_rem_sleep_time_milli?: number
    }
    sleep_performance_percentage?: number
    sleep_efficiency_percentage?: number
  } | null
}

export type WhoopConnectionTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: string
  scope: string | null
}

export type WhoopDailyMetricDraft = {
  metricDate: string
  cycleId: number
  sleepHours: number | null
  sleepScore: number | null
  hrvMs: number | null
  restingHrBpm: number | null
  recoveryScore: number | null
  strainScore: number | null
  caloriesKcal: number | null
}
