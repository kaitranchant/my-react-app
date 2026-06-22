'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterPills } from '@/components/ui/filter-pills'
import {
  parseLeaderboardFormula,
  parseLeaderboardMetric,
} from '@/lib/validations/leaderboard'

export function LeaderboardFormulaTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)

  if (metric !== 'relative_strength') {
    return null
  }

  const formula = parseLeaderboardFormula(searchParams.get('formula') ?? undefined)

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'dots') {
      params.delete('formula')
    } else {
      params.set('formula', value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <FilterPills
      label="Formula"
      value={formula}
      onChange={handleChange}
      size="sm"
      options={[
        { value: 'dots', label: 'DOTS' },
        { value: 'wilks', label: 'Wilks' },
      ]}
    />
  )
}
