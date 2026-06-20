'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  if (gyms.length <= 1) {
    return null
  }

  return (
    <Tabs value={selectedGymId} onValueChange={handleGymChange} className="min-w-0">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="inline-flex h-10 w-max gap-1">
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
