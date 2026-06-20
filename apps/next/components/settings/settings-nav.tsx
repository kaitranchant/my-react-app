'use client'

import { cn } from '@/lib/utils'

const sections = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'account', label: 'Account' },
] as const

export function SettingsNav() {
  return (
    <nav className="space-y-1 lg:sticky lg:top-6 lg:self-start">
      <p className="text-muted-foreground mb-3 px-3 text-xs font-medium uppercase tracking-wide">
        Settings
      </p>
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
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
