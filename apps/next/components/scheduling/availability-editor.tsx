'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { replaceAvailabilityRules } from '@/app/(dashboard)/scheduling/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WEEKDAY_OPTIONS } from '@/lib/calendar'
import { EmptyState } from '@/components/ui/empty-state'
import type { CoachAvailabilityRule } from '@/lib/session-booking-types'
import type { AvailabilityRuleValues } from '@/lib/validations/session-booking'

type AvailabilityEditorProps = {
  initialRules: CoachAvailabilityRule[]
}

type EditableRule = AvailabilityRuleValues & { key: string }

function toEditableRules(rules: CoachAvailabilityRule[]): EditableRule[] {
  return rules.map((rule) => ({
    key: rule.id,
    dayOfWeek: rule.day_of_week,
    startTime: rule.start_time.slice(0, 5),
    endTime: rule.end_time.slice(0, 5),
  }))
}

function createEmptyRule(): EditableRule {
  return {
    key: crypto.randomUUID(),
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
  }
}

export function AvailabilityEditor({ initialRules }: AvailabilityEditorProps) {
  const router = useRouter()
  const [rules, setRules] = React.useState<EditableRule[]>(() =>
    toEditableRules(initialRules)
  )
  const [pending, setPending] = React.useState(false)

  async function handleSave() {
    setPending(true)
    const result = await replaceAvailabilityRules(
      rules.map(({ dayOfWeek, startTime, endTime }) => ({
        dayOfWeek,
        startTime,
        endTime,
      }))
    )
    setPending(false)

    if (result.success) {
      toast.success('Availability saved')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      <p className="helper-text">
        Set your weekly hours when clients can book. Add multiple windows per day if needed.
      </p>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No availability configured"
            description="Add your weekly hours so clients can book sessions."
            action={{ label: 'Add time window', onClick: () => setRules([createEmptyRule()]) }}
          />
        ) : null}

        {rules.map((rule) => (
          <div
            key={rule.key}
            className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
          >
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">Day</p>
              <Select
                value={String(rule.dayOfWeek)}
                onValueChange={(value) =>
                  setRules((current) =>
                    current.map((entry) =>
                      entry.key === rule.key
                        ? { ...entry, dayOfWeek: Number(value) }
                        : entry
                    )
                  )
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_OPTIONS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">Start</p>
              <Input
                type="time"
                value={rule.startTime}
                onChange={(event) =>
                  setRules((current) =>
                    current.map((entry) =>
                      entry.key === rule.key
                        ? { ...entry, startTime: event.target.value }
                        : entry
                    )
                  )
                }
                className="w-[130px]"
              />
            </div>

            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium">End</p>
              <Input
                type="time"
                value={rule.endTime}
                onChange={(event) =>
                  setRules((current) =>
                    current.map((entry) =>
                      entry.key === rule.key
                        ? { ...entry, endTime: event.target.value }
                        : entry
                    )
                  )
                }
                className="w-[130px]"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove window"
              onClick={() =>
                setRules((current) => current.filter((entry) => entry.key !== rule.key))
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRules((current) => [...current, createEmptyRule()])}
        >
          <Plus className="mr-2 size-4" />
          Add window
        </Button>
        <Button type="button" onClick={handleSave} disabled={pending}>
          Save availability
        </Button>
      </div>
    </div>
  )
}
