'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterPills } from '@/components/ui/filter-pills'
import type { GymCoachMetrics } from '@/lib/gym-metrics'

type GymCoachFilterProps = {
  coaches: GymCoachMetrics[]
  selectedCoachId: string | null
}

export function GymCoachFilter({
  coaches,
  selectedCoachId,
}: GymCoachFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (coaches.length <= 1) {
    return null
  }

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all-coaches') {
      params.delete('coach')
    } else {
      params.set('coach', value)
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const options = [
    { value: 'all-coaches', label: 'All coaches' },
    ...coaches.map((coach) => ({
      value: coach.coachId,
      label: coach.coachName,
      title: coach.coachName,
    })),
  ]

  return (
    <FilterPills
      label="Filter by coach"
      value={selectedCoachId ?? 'all-coaches'}
      onChange={handleChange}
      options={options}
    />
  )
}
