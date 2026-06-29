'use client'

import { useEffect } from 'react'

import { cn } from '@/lib/utils'
import { scrollElementIntoMainContent } from '@/lib/visual-viewport/app-viewport'

const baseSections = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'account', label: 'Account' },
] as const

const leaderboardSection = { id: 'leaderboard', label: 'Leaderboards' } as const

function scrollToSection(id: string) {
  const target = document.getElementById(id)
  if (!target) return

  window.history.replaceState(null, '', `#${id}`)
  scrollElementIntoMainContent(target, { behavior: 'smooth', block: 'start' })
}

type PortalSettingsNavProps = {
  showProfile?: boolean
  showLeaderboard?: boolean
}

export function PortalSettingsNav({
  showProfile = true,
  showLeaderboard = false,
}: PortalSettingsNavProps) {
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '')
    if (!id) return

    const target = document.getElementById(id)
    if (target) {
      scrollElementIntoMainContent(target, { behavior: 'instant', block: 'start' })
    }
  }, [])

  const sections = [
    ...(showProfile ? [baseSections[0]] : []),
    baseSections[1],
    baseSections[2],
    baseSections[3],
    ...(showLeaderboard ? [leaderboardSection] : []),
    baseSections[4],
  ]

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
