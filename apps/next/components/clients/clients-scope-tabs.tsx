'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { resolveClientsScope } from '@/lib/clients-list-query'
import { FilterPillLinks } from '@/components/ui/filter-pills'

type GymTab = {
  id: string
  name: string
}

export function ClientsScopeTabs({ gyms }: { gyms: GymTab[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const scope = resolveClientsScope(searchParams.get('scope') ?? undefined, gyms)

  const options = useMemo(() => {
    function buildHref(value: string) {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all') {
        params.delete('scope')
      } else {
        params.set('scope', value)
      }
      params.delete('page')
      const query = params.toString()
      return query ? `${pathname}?${query}` : pathname
    }

    return [
      { value: 'all', label: 'All' },
      { value: 'personal', label: 'Personal' },
      ...gyms.map((gym) => ({
        value: gym.id,
        label: gym.name,
      })),
    ].map((option) => ({
      href: buildHref(option.value),
      label: option.label,
      active: scope === option.value,
    }))
  }, [gyms, pathname, scope, searchParams])

  return <FilterPillLinks options={options} />
}
