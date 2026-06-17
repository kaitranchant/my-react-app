'use client'

import type { UseFormReturn } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  EXERCISE_BLOCK_OPTIONS,
  SUPERSET_GROUP_OPTIONS,
} from '@/lib/exercise-groups'
import { cn } from '@/lib/utils'
import { normalizeRepsInput } from '@/lib/validations/calendar'
import type { ScheduledExercisePrescriptionValues } from '@/lib/validations/calendar'

const SET_OPTIONS = Array.from({ length: 10 }, (_, index) => String(index + 1))

type TrackingOptionKey = keyof ScheduledExercisePrescriptionValues['trackingOptions']

const TRACKING_TOGGLES: {
  key: TrackingOptionKey
  label: string
  description: string
}[] = [
  {
    key: 'completionLift',
    label: 'Completion lift',
    description: 'Mark done only — no weight or rep logging.',
  },
  {
    key: 'bodyweight',
    label: 'Bodyweight lift',
    description: 'Log reps only, no load input.',
  },
  {
    key: 'coachCompletes',
    label: 'Coach completes',
    description: 'You log results for the client.',
  },
  {
    key: 'disablePrTracking',
    label: 'Disable PR tracking',
    description: 'Do not compare against 1RM or rep PRs.',
  },
  {
    key: 'forcePrUpdate',
    label: 'Force PR update',
    description: 'Treat a strong session as a new PR.',
  },
  {
    key: 'trackBarSpeed',
    label: 'Bar speed',
    description: 'Include m/s velocity input.',
  },
  {
    key: 'trackPeakPower',
    label: 'Peak power',
    description: 'Include peak power input.',
  },
  {
    key: 'trackReps',
    label: 'Track rep count',
    description: 'Count reps toward session volume.',
  },
  {
    key: 'trackVolume',
    label: 'Track volume load',
    description: 'Include in volume load totals.',
  },
]

type ExercisePrescriptionFormProps = {
  form: UseFormReturn<ScheduledExercisePrescriptionValues>
  idPrefix?: string
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <FormDescription className="text-[11px] leading-snug">{children}</FormDescription>
  )
}

export function ExercisePrescriptionForm({
  form,
  idPrefix = 'prescription',
}: ExercisePrescriptionFormProps) {
  const repMode = form.watch('repMode')
  const selectedBlock = form.watch('exerciseBlock')

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="workoutNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Workout-specific notes</FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                maxLength={255}
                placeholder="Instructions for this session only (max 255 chars)"
                {...field}
              />
            </FormControl>
            <FieldHint>
              Visible to the client for this workout — cues, substitutions, etc.
            </FieldHint>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="sets"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sets</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger id={`${idPrefix}-sets`}>
                    <SelectValue placeholder="Select sets" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SET_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHint>Number of working sets (1–10).</FieldHint>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="repMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reps or time</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger id={`${idPrefix}-rep-mode`}>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="reps">Reps</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                </SelectContent>
              </Select>
              <FieldHint>Time for holds, carries, or intervals.</FieldHint>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="reps"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{repMode === 'time' ? 'Duration' : 'Reps'}</FormLabel>
            <FormControl>
              <Input
                placeholder={
                  repMode === 'time'
                    ? '30s, 1:00, 300m'
                    : '10, 10-12, F for to failure, C for custom'
                }
                {...field}
                onBlur={(event) => {
                  field.onBlur()
                  if (repMode === 'reps') {
                    const normalized = normalizeRepsInput(event.target.value)
                    if (normalized !== event.target.value.trim()) {
                      field.onChange(normalized)
                    }
                  }
                }}
              />
            </FormControl>
            <FieldHint>
              {repMode === 'time'
                ? 'Seconds, mm:ss, or distance.'
                : 'Use F for to failure, C for a custom target.'}
            </FieldHint>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="eachSide"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start gap-3 rounded-sm border p-3">
            <FormControl>
              <input
                id={`${idPrefix}-each-side`}
                type="checkbox"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                className="mt-1 size-4 rounded border"
              />
            </FormControl>
            <div className="space-y-1">
              <FormLabel htmlFor={`${idPrefix}-each-side`} className="font-medium">
                Each side
              </FormLabel>
              <FieldHint>Left and right — common for unilateral work.</FieldHint>
            </div>
          </FormItem>
        )}
      />

      <div className="space-y-4 rounded-sm border p-4">
        <div>
          <p className="text-sm font-medium">Workout structure</p>
          <p className="text-muted-foreground text-xs">
            Organize where this exercise sits in the session and how it pairs with
            others.
          </p>
        </div>

        <FormField
          control={form.control}
          name="exerciseBlock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise section</FormLabel>
              <Select
                onValueChange={(value) =>
                  field.onChange(value === '__none__' ? '' : value)
                }
                value={field.value || '__none__'}
              >
                <FormControl>
                  <SelectTrigger id={`${idPrefix}-exercise-block`}>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {EXERCISE_BLOCK_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHint>
                {selectedBlock
                  ? EXERCISE_BLOCK_OPTIONS.find((option) => option.value === selectedBlock)
                      ?.description
                  : 'Warm-up, main lift, core, cooldown, and other session blocks.'}
              </FieldHint>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supersetGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Superset / circuit group</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                value={field.value || '__none__'}
              >
                <FormControl>
                  <SelectTrigger id={`${idPrefix}-superset`}>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none__">None</SelectItem>
                  {SUPERSET_GROUP_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      Group {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHint>
                Exercises with the same letter are performed back-to-back (A–Z).
              </FieldHint>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="tempo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tempo</FormLabel>
              <FormControl>
                <Input placeholder="3-0-1-0" {...field} />
              </FormControl>
              <FieldHint>Eccentric–pause–concentric–pause.</FieldHint>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="restSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rest between sets</FormLabel>
              <FormControl>
                <Input placeholder="90" {...field} />
              </FormControl>
              <FieldHint>Seconds of rest before the next set.</FieldHint>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="prescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Extra prescription</FormLabel>
            <FormControl>
              <Input placeholder="RPE 8, cluster sets, band-assisted…" {...field} />
            </FormControl>
            <FieldHint>Short add-on cue shown in the workout summary.</FieldHint>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-3 rounded-sm border p-4">
        <div>
          <p className="text-sm font-medium">Logging & tracking</p>
          <p className="text-muted-foreground text-xs">
            Controls how this exercise is tracked when clients log workouts.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {TRACKING_TOGGLES.map(({ key, label, description }) => (
            <FormField
              key={key}
              control={form.control}
              name={`trackingOptions.${key}`}
              render={({ field }) => (
                <FormItem
                  className={cn(
                    'flex flex-row items-start gap-3 rounded-sm border p-3',
                    field.value && 'border-brand/40 bg-brand/5'
                  )}
                >
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={Boolean(field.value)}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="mt-0.5 size-4 rounded border"
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">{label}</FormLabel>
                    <FieldHint>{description}</FieldHint>
                  </div>
                </FormItem>
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
