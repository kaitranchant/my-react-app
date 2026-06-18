'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const tabs = [
  { href: '/library/exercises', label: 'Exercises' },
  { href: '/library/workouts', label: 'Workouts' },
  { href: '/library/programs', label: 'Programs' },
] as const

export function LibraryTabs() {
  const pathname = usePathname()

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-6">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'border-b-2 pb-3 text-sm font-medium transition-colors',
                active
                  ? 'border-brand text-brand'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
