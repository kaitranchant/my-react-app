'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'

import { SettingsRow } from '@/components/settings/settings-row'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <SettingsRow
      label="Color mode"
      description="Choose light, dark, or match your device settings."
    >
      <div
        className="bg-muted inline-flex rounded-lg p-1"
        role="group"
        aria-label="Color mode"
      >
        {themes.map(({ value, label, icon: Icon }) => {
          const active = mounted && theme === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              disabled={!mounted}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                !mounted && 'opacity-70'
              )}
              aria-pressed={active}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </button>
          )
        })}
      </div>
    </SettingsRow>
  )
}
