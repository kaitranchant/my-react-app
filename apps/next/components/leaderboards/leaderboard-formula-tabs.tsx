'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  parseLeaderboardFormula,
  parseLeaderboardMetric,
} from '@/lib/validations/leaderboard'

export function LeaderboardFormulaTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)

  if (metric !== 'relative_strength') {
    return null
  }

  const formula = parseLeaderboardFormula(searchParams.get('formula') ?? undefined)

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'dots') {
      params.delete('formula')
    } else {
      params.set('formula', value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Formula
      </p>
      <Tabs value={formula} onValueChange={handleChange} className="min-w-0">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="inline-flex h-9 w-max gap-1 bg-muted/50">
            <TabsTrigger value="dots" className="flex-none px-3 text-sm">
              DOTS
            </TabsTrigger>
            <TabsTrigger value="wilks" className="flex-none px-3 text-sm">
              Wilks
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}
