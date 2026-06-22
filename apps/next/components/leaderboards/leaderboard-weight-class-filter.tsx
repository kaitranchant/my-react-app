'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterPills } from '@/components/ui/filter-pills'
import { parseLeaderboardWeightClass } from '@/lib/validations/leaderboard'

type LeaderboardWeightClassFilterProps = {
  weightClasses: string[]
}

export function LeaderboardWeightClassFilter({
  weightClasses,
}: LeaderboardWeightClassFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (weightClasses.length === 0) {
    return null
  }

  const selected =
    parseLeaderboardWeightClass(searchParams.get('class') ?? undefined) ??
    'all'

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('class')
    } else {
      params.set('class', value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <FilterPills
      label="Weight class"
      value={selected}
      onChange={handleChange}
      size="sm"
      options={[
        { value: 'all', label: 'All classes' },
        ...weightClasses.map((weightClass) => ({
          value: weightClass,
          label: weightClass,
        })),
      ]}
    />
  )
}
