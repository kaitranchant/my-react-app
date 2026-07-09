'use client'

import { FilterPills } from '@/components/ui/filter-pills'
import type { GymCoachMetrics } from '@/lib/gym-metrics'

type GymCoachFilterProps = {
  coaches: GymCoachMetrics[]
  selectedCoachId: string | null
  onChange: (coachId: string | null) => void
}

export function GymCoachFilter({
  coaches,
  selectedCoachId,
  onChange,
}: GymCoachFilterProps) {
  if (coaches.length <= 1) {
    return null
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
      onChange={(value) =>
        onChange(value === 'all-coaches' ? null : value)
      }
      options={options}
    />
  )
}
