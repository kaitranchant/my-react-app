'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const SHORTCUTS = [
  { keys: ['N'], description: 'Add a new client' },
  { keys: ['C'], description: 'Open check-ins' },
  { keys: ['Ctrl', 'K'], description: 'Search clients, workouts, and programs' },
  { keys: ['Esc'], description: 'Close dialogs and overlays' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
] as const

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

function ShortcutKeys({ keys }: { keys: readonly string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 ? (
            <span className="text-muted-foreground text-xs">+</span>
          ) : null}
          <kbd className="bg-muted text-muted-foreground rounded border px-1.5 py-0.5 text-[10px] font-medium">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  )
}

export function DashboardShortcuts() {
  const router = useRouter()
  const [helpOpen, setHelpOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return

      if (event.key === '?' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        setHelpOpen(true)
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        router.push('/clients?add=1')
        return
      }

      if (event.key === 'c' || event.key === 'C') {
        event.preventDefault()
        router.push('/check-ins')
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [router])

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Quick actions available anywhere in the coach dashboard.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.description}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm">{shortcut.description}</span>
              <ShortcutKeys keys={shortcut.keys} />
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <Button type="button" onClick={() => setHelpOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
