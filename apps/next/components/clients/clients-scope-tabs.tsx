'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterPills } from '@/components/ui/filter-pills'

type GymTab = {
  id: string
  name: string
}

function resolveScope(rawScope: string, gymIds: string[]) {
  if (rawScope === 'all' || rawScope === 'personal') {
    return rawScope
  }
  if (gymIds.includes(rawScope)) {
    return rawScope
  }
  if (rawScope === 'gym' && gymIds.length === 1) {
    return gymIds[0]
  }
  return 'all'
}

export function ClientsScopeTabs({ gyms }: { gyms: GymTab[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const gymIds = gyms.map((gym) => gym.id)
  const scope = resolveScope(searchParams.get('scope') ?? 'all', gymIds)

  function handleScopeChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('scope')
    } else {
      params.set('scope', value)
    }
    params.delete('page')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const options = [
    { value: 'all', label: 'All' },
    { value: 'personal', label: 'Personal' },
    ...gyms.map((gym) => ({
      value: gym.id,
      label: gym.name,
      title: gym.name,
    })),
  ]

  return (
    <FilterPills value={scope} onChange={handleScopeChange} options={options} />
  )
}
