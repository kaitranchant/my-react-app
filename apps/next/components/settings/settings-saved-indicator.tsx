'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export function SettingsSavedIndicator({
  visible,
  className,
}: {
  visible: boolean
  className?: string
}) {
  return (
    <span
      aria-live="polite"
      className={cn(
        'text-status-success inline-flex items-center gap-1 text-xs font-medium transition-opacity duration-200',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      <Check className="size-3.5" />
      Saved
    </span>
  )
}

export function useSettingsSavedIndicator(durationMs = 2000) {
  const [savedKey, setSavedKey] = React.useState<string | null>(null)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  function markSaved(key: string) {
    setSavedKey(key)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setSavedKey((current) => (current === key ? null : current))
    }, durationMs)
  }

  return { savedKey, markSaved }
}
