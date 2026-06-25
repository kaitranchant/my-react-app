import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MacroAdherenceBadges } from '@/components/nutrition/macro-adherence-badges'
import { formatAdherenceScore } from '@/lib/nutrition'
import {
  buildMacroAdherenceItems,
  sumFoodDiaryMacros,
} from '@/lib/food-diary'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
} from 'app/types/database'

type NutritionLogListProps = {
  logs: ClientNutritionLog[]
  profile: ClientNutritionProfile | null
  foodDiaryEntries?: ClientFoodDiaryEntry[]
}

export function NutritionLogList({
  logs,
  profile,
  foodDiaryEntries = [],
}: NutritionLogListProps) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Adherence history</CardTitle>
          <CardDescription>
            Daily nutrition adherence logs from this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No daily nutrition logs yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  const entriesByDate = new Map<string, ClientFoodDiaryEntry[]>()
  for (const entry of foodDiaryEntries) {
    const existing = entriesByDate.get(entry.log_date) ?? []
    existing.push(entry)
    entriesByDate.set(entry.log_date, existing)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adherence history</CardTitle>
        <CardDescription>
          Recent daily scores with macro breakdown when food is logged.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-border divide-y">
          {logs.map((log) => {
            const dayEntries = entriesByDate.get(log.log_date) ?? []
            const consumed = sumFoodDiaryMacros(dayEntries)
            const macroItems = buildMacroAdherenceItems(
              consumed,
              profile,
              log.water_ml,
              log.fiber_g
            )

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
      </CardContent>
    </Card>
  )
}
