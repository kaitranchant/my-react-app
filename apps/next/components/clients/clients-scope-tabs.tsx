'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  return (
    <Tabs value={scope} onValueChange={handleScopeChange} className="min-w-0">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="inline-flex h-10 w-max gap-1">
          <TabsTrigger value="all" className="flex-none px-4">
            All
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex-none px-4">
            Personal
          </TabsTrigger>
          {gyms.map((gym) => (
            <TabsTrigger
              key={gym.id}
              value={gym.id}
              title={gym.name}
              className="flex-none px-4"
            >
              {gym.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  )
}
