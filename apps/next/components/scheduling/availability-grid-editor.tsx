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

const GRID_START_HOUR = 5
const GRID_END_HOUR = 21
const SLOT_MINUTES = 30
const GRID_START_MINUTES = GRID_START_HOUR * 60
const GRID_END_MINUTES = GRID_END_HOUR * 60
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

const WEEKDAY_FULL_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

function formatHourLabel(hour: number, compact = false): string {
  const hour12 = hour % 12 || 12
  const period = hour >= 12 ? 'pm' : 'am'
  if (compact) {
    return `${hour12}${period === 'am' ? 'a' : 'p'}`
  }
  return `${hour12}${period}`
}

function hourSlots(hour: number): number[] {
  return [hour * 60, hour * 60 + SLOT_MINUTES]
}

function HourCell({
  day,
  dayLabel,
  hour,
  grid,
  onSlotPointerDown,
  onSlotPointerEnter,
  onSlotToggle,
  highlighted = false,
  tall = false,
}: {
  day: number
  dayLabel: string
  hour: number
  grid: Record<number, Set<number>>
  onSlotPointerDown: (day: number, slotMinutes: number) => void
  onSlotPointerEnter: (day: number, slotMinutes: number) => void
  onSlotToggle: (day: number, slotMinutes: number) => void
  highlighted?: boolean
  tall?: boolean
}) {
  const slots = hourSlots(hour)

  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-md border border-border/60',
        tall ? 'h-10' : 'h-8',
        highlighted && 'ring-primary/40 ring-1'
      )}
    >
      {slots.map((slotMinutes, index) => {
        const active = grid[day]?.has(slotMinutes)
        return (
          <button
            key={slotMinutes}
            type="button"
            aria-label={`Toggle ${dayLabel} at ${minutesToTimeString(slotMinutes)}`}
            aria-pressed={active}
            onPointerDown={(event) => {
              event.preventDefault()
              onSlotPointerDown(day, slotMinutes)
            }}
            onPointerEnter={() => onSlotPointerEnter(day, slotMinutes)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              onSlotToggle(day, slotMinutes)
            }}
            className={cn(
              'flex-1 touch-none transition select-none',
              index > 0 && 'border-l border-border/50',
              active
                ? 'bg-primary/25 hover:bg-primary/35'
                : 'bg-muted/20 hover:bg-muted/50'
            )}
          />
        )
      })}
    </div>
  )
}

function rulesToGrid(
  rules: AvailabilityRuleValues[]
): Record<number, Set<number>> {
  const grid: Record<number, Set<number>> = {}
  for (const day of DAY_ORDER) {
    grid[day] = new Set()
  }

  for (const rule of rules) {
    const startMinutes = parseTimeToMinutes(rule.startTime)
    const endMinutes = parseTimeToMinutes(rule.endTime)

    for (
      let slot = GRID_START_MINUTES;
      slot < GRID_END_MINUTES;
      slot += SLOT_MINUTES
    ) {
      if (slot < endMinutes && slot + SLOT_MINUTES > startMinutes) {
        grid[rule.dayOfWeek]?.add(slot)
      }
    }
  }

  return grid
}

function formatTimeDisplay(time: string): string {
  const minutes = parseTimeToMinutes(time)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const period = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(mins).padStart(2, '0')}${period}`
}

function formatAvailabilitySummaries(
  grid: Record<number, Set<number>>
): { day: number; text: string }[] {
  const rules = gridToRules(grid)
  const rulesByDay = new Map<number, AvailabilityRuleValues[]>()

  for (const rule of rules) {
    const dayRules = rulesByDay.get(rule.dayOfWeek) ?? []
    dayRules.push(rule)
    rulesByDay.set(rule.dayOfWeek, dayRules)
  }

  const summaries: { day: number; text: string }[] = []

  for (const day of DAY_ORDER) {
    const dayRules = rulesByDay.get(day)
    if (!dayRules?.length) continue

    const windows = dayRules
      .map(
        (rule) =>
          `${formatTimeDisplay(rule.startTime)} to ${formatTimeDisplay(rule.endTime)}`
      )
      .join(' and ')

    summaries.push({
      day,
      text: `Available ${WEEKDAY_FULL_NAMES[day]} ${windows}`,
    })
  }

  return summaries
}

function AvailabilitySummary({
  grid,
}: {
  grid: Record<number, Set<number>>
}) {
  const summaries = React.useMemo(
    () => formatAvailabilitySummaries(grid),
    [grid]
  )

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-medium">Your schedule</p>
      {summaries.length === 0 ? (
        <p className="text-muted-foreground mt-1 text-sm">
          No availability set yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {summaries.map((summary) => (
            <li key={summary.day} className="text-muted-foreground text-sm">
              {summary.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function gridToRules(grid: Record<number, Set<number>>): AvailabilityRuleValues[] {
  const rules: AvailabilityRuleValues[] = []

  for (const day of DAY_ORDER) {
    const slots = Array.from(grid[day] ?? []).sort((left, right) => left - right)
    if (slots.length === 0) continue

    let rangeStart = slots[0]!
    let previous = slots[0]!

    for (let index = 1; index < slots.length; index++) {
      const slot = slots[index]!
      if (slot === previous + SLOT_MINUTES) {
        previous = slot
        continue
      }

      rules.push({
        dayOfWeek: day,
        startTime: minutesToTimeString(rangeStart),
        endTime: minutesToTimeString(previous + SLOT_MINUTES),
      })
      rangeStart = slot
      previous = slot
    }

    rules.push({
      dayOfWeek: day,
      startTime: minutesToTimeString(rangeStart),
      endTime: minutesToTimeString(previous + SLOT_MINUTES),
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
  onSlotPointerDown,
  onSlotPointerEnter,
  onSlotToggle,
}: {
  day: number
  dayLabel: string
  hours: number[]
  grid: Record<number, Set<number>>
  onSlotPointerDown: (day: number, slotMinutes: number) => void
  onSlotPointerEnter: (day: number, slotMinutes: number) => void
  onSlotToggle: (day: number, slotMinutes: number) => void
}) {
  return (
    <div className="grid grid-cols-[2.75rem_1fr] gap-x-2 gap-y-1.5 select-none">
      {hours.map((hour) => (
        <React.Fragment key={hour}>
          <div className="text-muted-foreground flex items-center justify-end pr-1 text-sm tabular-nums">
            {formatHourLabel(hour)}
          </div>
          <HourCell
            day={day}
            dayLabel={dayLabel}
            hour={hour}
            grid={grid}
            onSlotPointerDown={onSlotPointerDown}
            onSlotPointerEnter={onSlotPointerEnter}
            onSlotToggle={onSlotToggle}
            tall
          />
        </React.Fragment>
      ))}
    </div>
  )
}

type PaintDragState = {
  painting: boolean
  paintValue: boolean
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
  const paintDragRef = React.useRef<PaintDragState | null>(null)

  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, index) => GRID_START_HOUR + index
  )

  const dayLabels = DAY_ORDER.map(
    (day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label ?? ''
  )

  React.useEffect(() => {
    function endPaintDrag() {
      paintDragRef.current = null
    }

    window.addEventListener('pointerup', endPaintDrag)
    window.addEventListener('pointercancel', endPaintDrag)
    return () => {
      window.removeEventListener('pointerup', endPaintDrag)
      window.removeEventListener('pointercancel', endPaintDrag)
    }
  }, [])

  function applySlot(day: number, slotMinutes: number, active: boolean) {
    setGrid((current) => {
      const daySet = current[day] ?? new Set<number>()
      if (daySet.has(slotMinutes) === active) {
        return current
      }

      const next = { ...current, [day]: new Set(daySet) }
      if (active) {
        next[day]!.add(slotMinutes)
      } else {
        next[day]!.delete(slotMinutes)
      }
      return next
    })
  }

  function handleSlotPointerDown(day: number, slotMinutes: number) {
    setGrid((current) => {
      const paintValue = !current[day]?.has(slotMinutes)
      paintDragRef.current = { painting: true, paintValue }

      const next = { ...current, [day]: new Set(current[day]) }
      if (paintValue) {
        next[day]!.add(slotMinutes)
      } else {
        next[day]!.delete(slotMinutes)
      }
      return next
    })
  }

  function handleSlotPointerEnter(day: number, slotMinutes: number) {
    if (!paintDragRef.current?.painting) return
    applySlot(day, slotMinutes, paintDragRef.current.paintValue)
  }

  function handleSlotToggle(day: number, slotMinutes: number) {
    setGrid((current) => {
      const next = { ...current, [day]: new Set(current[day]) }
      if (next[day]!.has(slotMinutes)) {
        next[day]!.delete(slotMinutes)
      } else {
        next[day]!.add(slotMinutes)
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
        Click or drag across blocks to set availability. Each hour is split —
        left is :00, right is :30. Dragging over filled blocks clears them.
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
            onSlotPointerDown={handleSlotPointerDown}
            onSlotPointerEnter={handleSlotPointerEnter}
            onSlotToggle={handleSlotToggle}
          />
        </>
      ) : (
        <div className="overflow-x-auto select-none">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-x-1.5 gap-y-1">
              <div />
              {DAY_ORDER.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDay(day)}
                  className={cn(
                    'rounded-md py-1.5 text-center text-xs font-medium transition',
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
                  <div className="text-muted-foreground flex items-center justify-end pr-1 text-[11px] tabular-nums">
                    {formatHourLabel(hour, true)}
                  </div>
                  {DAY_ORDER.map((day, dayIndex) => (
                    <HourCell
                      key={`${day}-${hour}`}
                      day={day}
                      dayLabel={dayLabels[dayIndex] ?? ''}
                      hour={hour}
                      grid={grid}
                      onSlotPointerDown={handleSlotPointerDown}
                      onSlotPointerEnter={handleSlotPointerEnter}
                      onSlotToggle={handleSlotToggle}
                      highlighted={activeDay === day}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      <AvailabilitySummary grid={grid} />

      {applyRow}

      <Button type="button" onClick={handleSave} disabled={pending}>
        Save availability
      </Button>
    </div>
  )
}
