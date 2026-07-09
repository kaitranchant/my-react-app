'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterPills } from '@/components/ui/filter-pills'

type GymTab = {
  id: string
  name: string
}

export function GymScopeTabs({ gyms }: { gyms: GymTab[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const gymIds = gyms.map((gym) => gym.id)
  const rawGym = searchParams.get('gym') ?? gyms[0]?.id ?? ''
  const selectedGymId = gymIds.includes(rawGym) ? rawGym : gyms[0]?.id ?? ''

  function handleGymChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === gyms[0]?.id) {
      params.delete('gym')
    } else {
      params.set('gym', value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  if (gyms.length <= 1) {
    return null
  }

  return (
    <FilterPills
      label="Gym"
      value={selectedGymId}
      onChange={handleGymChange}
      options={gyms.map((gym) => ({
        value: gym.id,
        label: gym.name,
        title: gym.name,
      }))}
    />
  )
}
