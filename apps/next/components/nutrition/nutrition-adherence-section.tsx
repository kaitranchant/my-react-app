'use client'

import * as React from 'react'

import { NutritionTrendsChart } from '@/components/nutrition/nutrition-trends-chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildMacroAdherenceItems,
  sumFoodDiaryMacros,
} from '@/lib/food-diary'
import {
  averageAdherenceScore,
  buildNutritionTrendPoints,
} from '@/lib/nutrition-trends'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
} from 'app/types/database'
import { BarChart3 } from 'lucide-react'

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
    const allDates = new Set([
      ...logs.map((log) => log.log_date),
      ...Array.from(entriesByDate.keys()),
    ])

    for (const dateKey of Array.from(allDates)) {
      const log = logs.find((entry) => entry.log_date === dateKey)
      const dayEntries = entriesByDate.get(dateKey) ?? []
      if (dayEntries.length === 0 && !log) continue

      const consumed = sumFoodDiaryMacros(dayEntries)
      map.set(
        dateKey,
        buildMacroAdherenceItems(
          consumed,
          profile,
          log?.water_ml ?? null,
          log?.fiber_g ?? null
        )
      )
    }
    return map
  }, [entriesByDate, logs, profile])

  const trendPoints = buildNutritionTrendPoints(logs, limit, macroItemsByDate)
  const periodLogs = logs.filter((log) =>
    trendPoints.some((point) => point.dateKey === log.log_date)
  )
  const averageScore = averageAdherenceScore(periodLogs)

  const subject = clientName ? `${clientName}'s` : 'Your'

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Adherence</CardTitle>
          <CardDescription>
            {subject} daily nutrition scores. Green = on track, amber = partial,
            red = off plan.
            {averageScore != null ? (
              <>
                {' '}
                Avg {averageScore}/5 in this period.
              </>
            ) : null}
          </CardDescription>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="nutrition-adherence-period">Period</Label>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as '7' | '30' | '90')}
          >
            <SelectTrigger id="nutrition-adherence-period" className="w-[160px]">
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
        </div>
      </CardHeader>
      <CardContent>
        {trendPoints.length > 0 ? (
          <NutritionTrendsChart points={trendPoints} />
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No nutrition activity yet"
            description="Log daily adherence or food to see trends for this period."
            className="py-6"
          />
        )}
      </CardContent>
    </Card>
  )
}
