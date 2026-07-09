'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { switchAppSurface } from '@/lib/app-surface-actions'
import type { AppSurface } from '@/lib/app-surface'
import type { AppSurfaceContext } from '@/lib/app-surface-server'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AppSurfaceSwitcherProps = Pick<
  AppSurfaceContext,
  'activeSurface' | 'showSwitcher'
> & {
  className?: string
}

export function AppSurfaceSwitcher({
  activeSurface,
  showSwitcher,
  className,
}: AppSurfaceSwitcherProps) {
  const [pending, setPending] = React.useState<AppSurface | null>(null)

  if (!showSwitcher) {
    return null
  }

  async function handleSwitch(surface: AppSurface) {
    if (surface === activeSurface || pending) {
      return
    }

    setPending(surface)
    const result = await switchAppSurface(surface)
    setPending(null)

    if (result?.error) {
      toast.error(result.error)
    }
  }

  return (
    <div
      className={cn(
        'bg-muted inline-flex rounded-lg p-1',
        className
      )}
      data-testid="app-surface-switcher"
      role="group"
      aria-label="Switch between coach dashboard and client portal"
    >
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          'h-8 rounded-md px-2.5 text-xs font-medium sm:px-3 sm:text-sm',
          activeSurface === 'coach' && 'bg-background shadow-sm'
        )}
        disabled={pending !== null}
        aria-pressed={activeSurface === 'coach'}
        onClick={() => handleSwitch('coach')}
      >
        {pending === 'coach' ? 'Switching…' : 'Coach'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          'h-8 rounded-md px-2.5 text-xs font-medium sm:px-3 sm:text-sm',
          activeSurface === 'client' && 'bg-background shadow-sm'
        )}
        disabled={pending !== null}
        aria-pressed={activeSurface === 'client'}
        onClick={() => handleSwitch('client')}
      >
        {pending === 'client' ? 'Switching…' : 'Client'}
      </Button>
    </div>
  )
}
