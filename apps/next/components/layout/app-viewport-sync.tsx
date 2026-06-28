'use client'

import { useEffect } from 'react'

import { installAppViewportSync } from '@/lib/visual-viewport/app-viewport'

export function AppViewportSync() {
  useEffect(() => installAppViewportSync(), [])
  return null
}
