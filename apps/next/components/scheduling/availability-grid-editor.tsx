'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { toast } from 'sonner'

import { replaceAvailabilityRules } from '@/app/(dashboard)/scheduling/actions'
import { Button } from '@/components/ui/button'
import { WEEKDAY_OPTIONS } from '@/lib/calendar'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import type { CoachAvailabilityRule } from '@/lib/session-booking-types'
import type { AvailabilityRuleValues } from '@/lib/validations/session-booking'
import { cn } from '@/lib/utils'

type AvailabilityGridEditorProps = {
  initialRules: CoachAvailabilityRule[]
}

const GRID_START_HOUR = 7
const GRID_END_HOUR = 21
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

function rulesToGrid(
  rules: AvailabilityRuleValues[]
): Record<number, Set<number>> {
  const grid: Record<number, Set<number>> = {}
  for (const day of DAY_ORDER) {
    grid[day] = new Set()
  }

  for (const rule of rules) {
    const startHour = Number(rule.startTime.split(':')[0])
    const endHour = Number(rule.endTime.split(':')[0])
    const endMinute = Number(rule.endTime.split(':')[1])

    for (let hour = startHour; hour < endHour; hour++) {
      if (hour >= GRID_START_HOUR && hour < GRID_END_HOUR) {
        grid[rule.dayOfWeek]?.add(hour)
      }
    }

    if (endMinute > 0 && endHour >= GRID_START_HOUR && endHour < GRID_END_HOUR) {
      grid[rule.dayOfWeek]?.add(endHour)
    }
  }

  return grid
}

function gridToRules(grid: Record<number, Set<number>>): AvailabilityRuleValues[] {
  const rules: AvailabilityRuleValues[] = []

  for (const day of DAY_ORDER) {
    const hours = Array.from(grid[day] ?? []).sort((left, right) => left - right)
    if (hours.length === 0) continue

    let rangeStart = hours[0]!
    let previous = hours[0]!

    for (let index = 1; index < hours.length; index++) {
      const hour = hours[index]!
      if (hour === previous + 1) {
        previous = hour
        continue
      }

      rules.push({
        dayOfWeek: day,
        startTime: `${String(rangeStart).padStart(2, '0')}:00`,
        endTime: `${String(previous + 1).padStart(2, '0')}:00`,
      })
      rangeStart = hour
      previous = hour
    }

    rules.push({
      dayOfWeek: day,
      startTime: `${String(rangeStart).padStart(2, '0')}:00`,
      endTime: `${String(previous + 1).padStart(2, '0')}:00`,
    })
  }

  return rules
}

function toRuleValues(rules: CoachAvailabilityRule[]): AvailabilityRuleValues[] {
  return rules.map((rule) => ({
    dayOfWeek: rule.day_of_week,
    startTime: rule.start_time.slice(0, 5),
    endTime: rule.end_time.slice(0, 5),
  }))
}

function DayHourGrid({
  day,
  dayLabel,
  hours,
  grid,
  onToggle,
  largeCells = false,
}: {
  day: number
  dayLabel: string
  hours: number[]
  grid: Record<number, Set<number>>
  onToggle: (day: number, hour: number) => void
  largeCells?: boolean
}) {
  return (
    <div
      className={cn(
        'grid gap-1.5',
        largeCells ? 'grid-cols-[3.5rem_1fr]' : 'grid-cols-[48px_1fr]'
      )}
    >
      {hours.map((hour) => {
        const active = grid[day]?.has(hour)
        return (
          <React.Fragment key={hour}>
            <div
              className={cn(
                'text-muted-foreground flex items-center justify-end pr-1 text-xs',
                largeCells && 'text-sm'
              )}
            >
              {hour % 12 || 12}
              {hour >= 12 ? 'pm' : 'am'}
            </div>
            <button
              type="button"
              aria-label={`Toggle ${dayLabel} at ${hour}`}
              onClick={() => onToggle(day, hour)}
              className={cn(
                'rounded-md border transition',
                largeCells ? 'min-h-11' : 'h-8',
                active
                  ? 'border-primary bg-primary/20 hover:bg-primary/30'
                  : 'border-border/60 bg-background hover:bg-muted/60'
              )}
            />
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function AvailabilityGridEditor({
  initialRules,
}: AvailabilityGridEditorProps) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [grid, setGrid] = React.useState(() =>
    rulesToGrid(toRuleValues(initialRules))
  )
  const [pending, setPending] = React.useState(false)
  const [activeDay, setActiveDay] = React.useState<(typeof DAY_ORDER)[number]>(
    DAY_ORDER[0]!
  )
  const [applyTargets, setApplyTargets] = React.useState<Set<number>>(
    () => new Set()
  )
  const [applied, setApplied] = React.useState(false)

  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, index) => GRID_START_HOUR + index
  )

  const dayLabels = DAY_ORDER.map(
    (day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label ?? ''
  )

  function toggleCell(day: number, hour: number) {
    setGrid((current) => {
      const next = { ...current, [day]: new Set(current[day]) }
      if (next[day]!.has(hour)) {
        next[day]!.delete(hour)
      } else {
        next[day]!.add(hour)
      }
      return next
    })
  }

  function toggleApplyTarget(day: number) {
    setApplyTargets((current) => {
      const next = new Set(current)
      if (next.has(day)) {
        next.delete(day)
      } else {
        next.add(day)
      }
      return next
    })
  }

  function applyScheduleToTargets(sourceDay: number, targets: number[]) {
    if (targets.length === 0) {
      toast.error('Select at least one day to apply to.')
      return
    }

    setGrid((current) => {
      const next = { ...current }
      const source = current[sourceDay] ?? new Set()
      for (const day of targets) {
        next[day] = new Set(source)
      }
      return next
    })
    setApplied(true)
    window.setTimeout(() => setApplied(false), 1200)
  }

  function applyToAllDays() {
    applyScheduleToTargets(
      activeDay,
      DAY_ORDER.filter((day) => day !== activeDay)
    )
  }

  async function handleSave() {
    setPending(true)
    const result = await replaceAvailabilityRules(gridToRules(grid))
    setPending(false)

    if (result.success) {
      toast.success('Availability saved')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const activeDayIndex = Math.max(0, DAY_ORDER.indexOf(activeDay))

  const applyRow = (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">
        Copy {dayLabels[activeDayIndex]}&apos;s hours to
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DAY_ORDER.map((day, index) => {
          if (day === activeDay) return null
          const selected = applyTargets.has(day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleApplyTarget(day)}
              className={cn(
                'flex size-9 items-center justify-center rounded-md border text-xs font-medium transition',
                selected
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border hover:bg-muted/60'
              )}
              aria-pressed={selected}
            >
              {dayLabels[index]}
            </button>
          )
        })}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() =>
            setApplyTargets(new Set(DAY_ORDER.filter((day) => day !== activeDay)))
          }
        >
          All
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            applyScheduleToTargets(activeDay, Array.from(applyTargets))
          }
        >
          {applied ? <Check className="mr-1 size-3.5" /> : null}
          Apply to selected
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={applyToAllDays}>
          Copy to all days
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <p className="helper-text">
        Tap time blocks to toggle when clients can book. Colored blocks are open
        hours.
      </p>

      {isMobile ? (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {DAY_ORDER.map((day, index) => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={cn(
                  'shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition',
                  activeDay === day
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted/60'
                )}
              >
                {dayLabels[index]}
              </button>
            ))}
          </div>
          <DayHourGrid
            day={activeDay}
            dayLabel={dayLabels[activeDayIndex] ?? ''}
            hours={hours}
            grid={grid}
            onToggle={toggleCell}
            largeCells
          />
        </>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] gap-1">
              <div />
              {DAY_ORDER.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={cn(
                    'rounded-md py-1 text-center text-xs font-medium transition',
                    activeDay === day
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60'
                  )}
                >
                  {dayLabels[index]}
                </button>
              ))}

              {hours.map((hour) => (
                <React.Fragment key={hour}>
                  <div className="text-muted-foreground pr-1 text-right text-[11px] leading-8">
                    {hour % 12 || 12}
                    {hour >= 12 ? 'p' : 'a'}
                  </div>
                  {DAY_ORDER.map((day, dayIndex) => {
                    const active = grid[day]?.has(hour)
                    return (
                      <button
                        key={`${day}-${hour}`}
                        type="button"
                        aria-label={`Toggle ${dayLabels[dayIndex]} at ${hour}`}
                        onClick={() => toggleCell(day, hour)}
                        className={cn(
                          'h-8 rounded-sm border transition',
                          active
                            ? 'border-primary bg-primary/20 hover:bg-primary/30'
                            : 'border-border/60 bg-background hover:bg-muted/60',
                          activeDay === day && 'ring-primary/40 ring-1'
                        )}
                      />
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {applyRow}

      <Button type="button" onClick={handleSave} disabled={pending}>
        Save availability
      </Button>
    </div>
  )
}
