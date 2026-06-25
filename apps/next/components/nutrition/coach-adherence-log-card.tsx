'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { submitClientNutritionLog } from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { NutritionAdherenceSelector } from '@/components/nutrition/nutrition-adherence-selector'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toDateKey } from '@/lib/calendar'
import {
  createEmptyNutritionLogValues,
  nutritionLogToFormValues,
} from '@/lib/nutrition'
import type { NutritionLogFormValues } from '@/lib/validations/nutrition'
import type { ClientNutritionLog } from 'app/types/database'

type CoachAdherenceLogCardProps = {
  clientId: string
  clientName: string
  todayLog: ClientNutritionLog | null
  logDate?: string
  onValuesChange?: (values: NutritionLogFormValues) => void
}

export function CoachAdherenceLogCard({
  clientId,
  clientName,
  todayLog,
  logDate,
  onValuesChange,
}: CoachAdherenceLogCardProps) {
  const router = useRouter()
  const todayKey = toDateKey(new Date())
  const targetDate = logDate ?? todayKey
  const isToday = targetDate === todayKey
  const [pending, setPending] = React.useState(false)
  const [values, setValues] = React.useState(
    todayLog && todayLog.log_date === targetDate
      ? nutritionLogToFormValues(todayLog)
      : createEmptyNutritionLogValues(targetDate)
  )

  React.useEffect(() => {
    setValues(
      todayLog && todayLog.log_date === targetDate
        ? nutritionLogToFormValues(todayLog)
        : createEmptyNutritionLogValues(targetDate)
    )
  }, [todayLog, targetDate])

  const onValuesChangeRef = React.useRef(onValuesChange)
  onValuesChangeRef.current = onValuesChange

  React.useEffect(() => {
    onValuesChangeRef.current?.(values)
  }, [values])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = await submitClientNutritionLog(clientId, values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Adherence log saved.')
    router.refresh()
  }

  const dateLabel = isToday
    ? 'today'
    : new Date(`${targetDate}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log adherence for {clientName}</CardTitle>
        <CardDescription>
          Record {clientName}&apos;s adherence score, fiber, and water for{' '}
          {dateLabel} on their behalf.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <NutritionAdherenceSelector
            value={values.adherenceScore}
            onChange={(score) =>
              setValues((current) => ({
                ...current,
                adherenceScore: score,
              }))
            }
            disabled={pending}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="coach-nutrition-fiber">Fiber (g)</Label>
              <Input
                id="coach-nutrition-fiber"
                type="number"
                min="0"
                step="0.1"
                placeholder="Optional"
                value={values.fiberG ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    fiberG:
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coach-nutrition-water">Water (ml)</Label>
              <Input
                id="coach-nutrition-water"
                type="number"
                min="0"
                step="1"
                placeholder="Optional"
                value={values.waterMl ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    waterMl:
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coach-nutrition-notes">Notes (optional)</Label>
            <Textarea
              id="coach-nutrition-notes"
              rows={2}
              placeholder="Context for this log entry"
              value={values.clientNotes ?? ''}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  clientNotes: event.target.value || null,
                }))
              }
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending
                ? 'Saving…'
                : todayLog && todayLog.log_date === targetDate
                  ? 'Update log'
                  : 'Save log'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
