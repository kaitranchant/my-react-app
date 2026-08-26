'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

import { resolveClientsListStatus } from '@/lib/clients-list-query'
import { FilterPillLinks } from '@/components/ui/filter-pills'
import { Input } from '@/components/ui/input'

export function ClientsToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = React.useState(searchParams.get('q') ?? '')
  const listStatus = resolveClientsListStatus(
    searchParams.get('status') ?? undefined
  )
  const archivedView = listStatus === 'archived'

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '' || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function buildSectionHref(section: 'users' | 'archive') {
    const params = new URLSearchParams(searchParams.toString())
    if (section === 'archive') {
      params.set('status', 'archived')
    } else {
      params.delete('status')
    }
    params.delete('page')
    const queryString = params.toString()
    return queryString ? `${pathname}?${queryString}` : pathname
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      const current = searchParams.get('q') ?? ''
      if (query !== current) {
        updateParams({ q: query })
      }
    }, 150)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  React.useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={archivedView ? 'Search archive…' : 'Search clients…'}
          className="pl-9"
        />
      </div>
      <FilterPillLinks
        options={[
          {
            href: buildSectionHref('users'),
            label: 'Users',
            active: !archivedView,
          },
          {
            href: buildSectionHref('archive'),
            label: 'Archive',
            active: archivedView,
          },
        ]}
      />
    </div>
  )
}
