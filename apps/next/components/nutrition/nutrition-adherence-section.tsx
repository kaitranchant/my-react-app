'use client'

import * as React from 'react'

import { MacroAdherenceBadges } from '@/components/nutrition/macro-adherence-badges'
import { NutritionTrendsChart } from '@/components/nutrition/nutrition-trends-chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatAdherenceScore } from '@/lib/nutrition'
import {
  buildMacroAdherenceItems,
  sumFoodDiaryMacros,
} from '@/lib/food-diary'
import { buildNutritionTrendPoints } from '@/lib/nutrition-trends'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
} from 'app/types/database'

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const

type NutritionAdherenceSectionProps = {
  logs: ClientNutritionLog[]
  profile: ClientNutritionProfile | null
  foodDiaryEntries?: ClientFoodDiaryEntry[]
  clientName?: string
}

export function NutritionAdherenceSection({
  logs,
  profile,
  foodDiaryEntries = [],
  clientName,
}: NutritionAdherenceSectionProps) {
  const [period, setPeriod] = React.useState<'7' | '30' | '90'>('7')
  const limit = Number(period)

  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, ClientFoodDiaryEntry[]>()
    for (const entry of foodDiaryEntries) {
      const existing = map.get(entry.log_date) ?? []
      existing.push(entry)
      map.set(entry.log_date, existing)
    }
    return map
  }, [foodDiaryEntries])

  const macroItemsByDate = React.useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildMacroAdherenceItems>>()
    for (const log of logs) {
      const dayEntries = entriesByDate.get(log.log_date) ?? []
      const consumed = sumFoodDiaryMacros(dayEntries)
      map.set(
        log.log_date,
        buildMacroAdherenceItems(consumed, profile, log.water_ml, log.fiber_g)
      )
    }
    return map
  }, [entriesByDate, logs, profile])

  const trendPoints = buildNutritionTrendPoints(logs, limit, macroItemsByDate)
  const historyLogs = [...logs]
    .sort((left, right) => right.log_date.localeCompare(left.log_date))
    .slice(0, limit)

  const subject = clientName ? `${clientName}'s` : 'Your'

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Adherence</CardTitle>
          <CardDescription>
            {subject} daily nutrition scores. Green = on track, amber = partial,
            red = off plan.
          </CardDescription>
        </div>
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value as '7' | '30' | '90')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="grid gap-6">
        {trendPoints.length > 0 ? (
          <NutritionTrendsChart points={trendPoints} />
        ) : (
          <p className="text-muted-foreground text-sm">
            No daily nutrition logs in this period yet.
          </p>
        )}

        {historyLogs.length > 0 ? (
          <div className="border-border border-t pt-4">
            <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wide">
              Daily log history
            </p>
            <ul className="divide-border divide-y">
              {historyLogs.map((log) => {
                const macroItems = macroItemsByDate.get(log.log_date) ?? []

                return (
                  <li
                    key={log.id}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {new Date(`${log.log_date}T12:00:00`).toLocaleDateString(
                            undefined,
                            {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            }
                          )}
                        </p>
                        {log.client_notes ? (
                          <p className="text-muted-foreground text-sm">
                            {log.client_notes}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium">
                        {formatAdherenceScore(log.adherence_score)}
                      </p>
                    </div>
                    {macroItems.length > 0 ? (
                      <MacroAdherenceBadges items={macroItems} />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
