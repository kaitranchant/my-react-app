'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Weight class
      </p>
      <Tabs value={selected} onValueChange={handleChange} className="min-w-0">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="inline-flex h-9 w-max gap-1 bg-muted/50">
            <TabsTrigger value="all" className="flex-none px-3 text-sm">
              All classes
            </TabsTrigger>
            {weightClasses.map((weightClass) => (
              <TabsTrigger
                key={weightClass}
                value={weightClass}
                className="flex-none px-3 text-sm"
              >
                {weightClass}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}
