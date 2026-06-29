'use client'

import { useEffect } from 'react'

import { cn } from '@/lib/utils'
import { scrollElementIntoMainContent } from '@/lib/visual-viewport/app-viewport'

const sections = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing', label: 'Billing' },
  { id: 'account', label: 'Account' },
] as const

function scrollToSection(id: string) {
  const target = document.getElementById(id)
  if (!target) return

  window.history.replaceState(null, '', `#${id}`)
  scrollElementIntoMainContent(target, { behavior: 'smooth', block: 'start' })
}

export function SettingsNav() {
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '')
    if (!id) return

    const target = document.getElementById(id)
    if (target) {
      scrollElementIntoMainContent(target, { behavior: 'instant', block: 'start' })
    }
  }, [])

  return (
    <nav className="space-y-1 lg:sticky lg:top-6 lg:self-start">
      <p className="text-muted-foreground mb-3 px-3 text-xs font-medium uppercase tracking-wide">
        Settings
      </p>
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(event) => {
            event.preventDefault()
            scrollToSection(section.id)
          }}
          className={cn(
            'text-muted-foreground hover:bg-muted hover:text-foreground block rounded-lg px-3 py-2 text-sm font-medium transition-colors'
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}
