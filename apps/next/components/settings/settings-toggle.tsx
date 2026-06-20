'use client'

import { cn } from '@/lib/utils'

export function SettingsToggle({
  checked,
  disabled,
  onCheckedChange,
  label,
}: {
  checked: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors',
        checked ? 'bg-brand' : 'bg-muted',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:opacity-90'
      )}
    >
      <span
        className={cn(
          'bg-background pointer-events-none block size-5 rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
