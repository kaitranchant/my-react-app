'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { buildLeaderboardFormulaHref } from '@/lib/leaderboard-page-data'
import { FilterPillLinks } from '@/components/ui/filter-pills'
import {
  parseLeaderboardFormula,
  parseLeaderboardMetric,
} from '@/lib/validations/leaderboard'

export function LeaderboardFormulaTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)

  const formula = parseLeaderboardFormula(searchParams.get('formula') ?? undefined)

  const options = useMemo(
    () => [
      {
        href: buildLeaderboardFormulaHref(pathname, searchParams, 'dots'),
        label: 'DOTS',
        active: formula === 'dots',
      },
      {
        href: buildLeaderboardFormulaHref(pathname, searchParams, 'wilks'),
        label: 'Wilks',
        active: formula === 'wilks',
      },
    ],
    [formula, pathname, searchParams]
  )

  if (metric !== 'relative_strength') {
    return null
  }

  return <FilterPillLinks label="Formula" size="sm" options={options} />
}
