'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { resolveClientsScope } from '@/lib/clients-list-query'
import { FilterPillLinks } from '@/components/ui/filter-pills'

type GymTab = {
  id: string
  name: string
}

export function ClientsScopeTabs({
  gyms,
  gymInvitedOnly = false,
}: {
  gyms: GymTab[]
  gymInvitedOnly?: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const scope = resolveClientsScope(searchParams.get('scope') ?? undefined, gyms, {
    gymInvitedOnly,
  })

  const options = useMemo(() => {
    function buildHref(value: string) {
      const params = new URLSearchParams(searchParams.toString())
      if (gymInvitedOnly || value !== 'all') {
        params.set('scope', value)
      } else {
        params.delete('scope')
      }
      params.delete('page')
      const query = params.toString()
      return query ? `${pathname}?${query}` : pathname
    }

    const scopeOptions = gymInvitedOnly
      ? gyms.map((gym) => ({
          value: gym.id,
          label: gym.name,
        }))
      : [
          { value: 'all', label: 'All' },
          { value: 'personal', label: 'Personal' },
          ...gyms.map((gym) => ({
            value: gym.id,
            label: gym.name,
          })),
        ]

    return scopeOptions.map((option) => ({
      href: buildHref(option.value),
      label: option.label,
      active: scope === option.value,
    }))
  }, [gymInvitedOnly, gyms, pathname, scope, searchParams])

  return <FilterPillLinks options={options} />
}
