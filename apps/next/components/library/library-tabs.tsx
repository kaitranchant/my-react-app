'use client'

import { FilterNavPills } from '@/components/ui/filter-pills'

const tabs = [
  { href: '/library/exercises', label: 'Exercises' },
  { href: '/library/workouts', label: 'Workouts' },
  { href: '/library/programs', label: 'Programs' },
  { href: '/library/meal-plans', label: 'Meal plans' },
  { href: '/library/message-templates', label: 'Message templates' },
] as const

export function LibraryTabs() {
  return <FilterNavPills tabs={tabs} />
}
