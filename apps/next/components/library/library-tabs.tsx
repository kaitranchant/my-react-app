'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const tabs = [
  { href: '/library/exercises', label: 'Exercises' },
  { href: '/library/workouts', label: 'Workouts' },
  { href: '/library/programs', label: 'Programs' },
  { href: '/library/meal-plans', label: 'Meal plans' },
  { href: '/library/meals', label: 'Meals' },
  { href: '/library/assessment-templates', label: 'Assessment templates' },
  { href: '/library/message-templates', label: 'Message templates' },
] as const

export function LibraryTabs() {
  const pathname = usePathname()

  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="inline-flex w-max gap-2">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`)

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'filter-pill shrink-0',
                active ? 'filter-pill-active' : 'filter-pill-inactive'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
