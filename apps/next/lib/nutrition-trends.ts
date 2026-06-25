import type { ClientNutritionLog } from 'app/types/database'
import type { MacroAdherenceItem } from '@/lib/food-diary'

export type NutritionTrendPoint = {
  dateKey: string
  label: string
  adherenceScore: number | null
  colorClass: string
  macroItems: MacroAdherenceItem[]
}

export type AdherenceColor = 'green' | 'amber' | 'red' | 'muted'

export function getAdherenceColor(score: number | null): AdherenceColor {
  if (score == null) return 'muted'
  if (score >= 4) return 'green'
  if (score >= 3) return 'amber'
  return 'red'
}

export const ADHERENCE_COLOR_CLASSES: Record<AdherenceColor, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  muted: 'bg-muted-foreground/30',
}

function formatTrendDateLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function buildNutritionTrendPoints(
  logs: ClientNutritionLog[],
  limit = 7,
  macroItemsByDate?: Map<string, MacroAdherenceItem[]>
): NutritionTrendPoint[] {
  return [...logs]
    .sort((left, right) => left.log_date.localeCompare(right.log_date))
    .slice(-limit)
    .map((log) => {
      const color = getAdherenceColor(log.adherence_score)
      return {
        dateKey: log.log_date,
        label: formatTrendDateLabel(log.log_date),
        adherenceScore: log.adherence_score,
        colorClass: ADHERENCE_COLOR_CLASSES[color],
        macroItems: macroItemsByDate?.get(log.log_date) ?? [],
      }
    })
}

export function averageAdherenceScore(logs: ClientNutritionLog[]): number | null {
  if (logs.length === 0) return null
  const total = logs.reduce((sum, log) => sum + log.adherence_score, 0)
  return Math.round((total / logs.length) * 10) / 10
}
