'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { buildLeaderboardWeightClassHref } from '@/lib/leaderboard-page-data'
import { FilterPillLinks } from '@/components/ui/filter-pills'
import { parseLeaderboardWeightClass } from '@/lib/validations/leaderboard'

type LeaderboardWeightClassFilterProps = {
  weightClasses: string[]
}

export function LeaderboardWeightClassFilter({
  weightClasses,
}: LeaderboardWeightClassFilterProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selected =
    parseLeaderboardWeightClass(searchParams.get('class') ?? undefined) ??
    'all'

  const options = useMemo(
    () => [
      {
        href: buildLeaderboardWeightClassHref(pathname, searchParams, 'all'),
        label: 'All classes',
        active: selected === 'all',
      },
      ...weightClasses.map((weightClass) => ({
        href: buildLeaderboardWeightClassHref(pathname, searchParams, weightClass),
        label: weightClass,
        active: selected === weightClass,
      })),
    ],
    [pathname, searchParams, selected, weightClasses]
  )

  if (weightClasses.length === 0) {
    return null
  }

  return <FilterPillLinks label="Weight class" size="sm" options={options} />
}
