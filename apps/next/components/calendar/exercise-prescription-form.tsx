'use client'

import * as React from 'react'
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
import {
  getPrescriptionSetCount,
  hasPerSetRepsTargets,
  isCustomRepsShortcut,
  normalizeRepsInput,
  parsePerSetReps,
  resizePerSetReps,
  serializePerSetReps,
} from '@/lib/validations/calendar'
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
    key: 'trackTime',
    label: 'Time tracking',
    description: 'Log how long each set took to complete.',
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
] as const

type ExercisePrescriptionFormProps = {
  form: UseFormReturn<ScheduledExercisePrescriptionValues>
  idPrefix?: string
  compact?: boolean
  hideSupersetGroup?: boolean
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <FormDescription className="text-[11px] leading-snug">{children}</FormDescription>
  )
}

function perSetRepsGridClass(setCount: number) {
  if (setCount <= 2) return 'grid-cols-2'
  if (setCount <= 4) return 'grid-cols-2 sm:grid-cols-4'
  if (setCount <= 6) return 'grid-cols-3 sm:grid-cols-6'
  return 'grid-cols-3 sm:grid-cols-5'
}

type CustomRepsEditorProps = {
  compact: boolean
  setCount: number
  values: string[]
  onChange: (values: string[]) => void
  onUseSameReps: () => void
}

function CustomRepsEditor({
  compact,
  setCount,
  values,
  onChange,
  onUseSameReps,
}: CustomRepsEditorProps) {
  return (
    <div className="space-y-2">
      <div className={cn('grid gap-2', perSetRepsGridClass(setCount))}>
        {values.map((value, index) => (
          <div key={index} className="space-y-1">
            <label
              htmlFor={`custom-reps-set-${index + 1}`}
              className="text-muted-foreground text-[11px] font-medium"
            >
              Set {index + 1}
            </label>
            <Input
              id={`custom-reps-set-${index + 1}`}
              className={compact ? 'h-9' : undefined}
              value={value}
              placeholder="10"
              onChange={(event) => {
                const next = [...values]
                next[index] = event.target.value
                onChange(next)
              }}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onUseSameReps}
        className="text-muted-foreground text-[11px] underline-offset-2 hover:underline"
      >
        Use same reps for all sets
      </button>
    </div>
  )
}

export function ExercisePrescriptionForm({
  form,
  idPrefix = 'prescription',
  compact = false,
  hideSupersetGroup = false,
}: ExercisePrescriptionFormProps) {
  const repMode = form.watch('repMode')
  const selectedBlock = form.watch('exerciseBlock')
  const setsValue = form.watch('sets')
  const repsValue = form.watch('reps')
  const setCount = getPrescriptionSetCount(setsValue)
  const [customRepsActive, setCustomRepsActive] = React.useState(false)
  const [perSetReps, setPerSetReps] = React.useState<string[]>(() =>
    resizePerSetReps([], setCount)
  )

  React.useEffect(() => {
    if (repMode !== 'reps') {
      setCustomRepsActive(false)
      return
    }

    if (hasPerSetRepsTargets(repsValue)) {
      setCustomRepsActive(true)
      setPerSetReps(resizePerSetReps(parsePerSetReps(repsValue), setCount))
      return
    }

    if (repsValue?.trim()) {
      setCustomRepsActive(false)
    }
  }, [repMode, repsValue, setCount])

  React.useEffect(() => {
    if (!customRepsActive) return
    setPerSetReps((current) => resizePerSetReps(current, setCount))
  }, [customRepsActive, setCount])

  const activateCustomReps = React.useCallback(() => {
    setCustomRepsActive(true)
    setPerSetReps(resizePerSetReps([], setCount))
    form.setValue('reps', '', { shouldDirty: true })
  }, [form, setCount])

  const updatePerSetReps = React.useCallback(
    (values: string[]) => {
      setPerSetReps(values)
      form.setValue('reps', serializePerSetReps(values), {
        shouldDirty: true,
        shouldValidate: true,
      })
    },
    [form]
  )

  const exitCustomReps = React.useCallback(() => {
    const filled = perSetReps.map((value) => value.trim()).filter(Boolean)
    const sameForAll =
      filled.length > 0 && filled.every((value) => value === filled[0])
        ? filled[0]
        : filled[0] ?? ''

    setCustomRepsActive(false)
    setPerSetReps(resizePerSetReps([], setCount))
    form.setValue('reps', sameForAll, { shouldDirty: true, shouldValidate: true })
  }, [form, perSetReps, setCount])

  return (
    <div className={cn(compact ? 'flex min-h-0 flex-1 flex-col space-y-3' : 'space-y-3')}>
      {!compact ? (
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
      ) : null}

      <div
        className={cn(
          'grid gap-3',
          compact ? 'grid-cols-2 shrink-0' : 'gap-4 sm:grid-cols-2'
        )}
      >
        <FormField
          control={form.control}
          name="sets"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sets</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger id={`${idPrefix}-sets`} className={compact ? 'h-9' : undefined}>
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
              {!compact ? <FieldHint>Number of working sets (1–10).</FieldHint> : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="repMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reps, time, or distance</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger id={`${idPrefix}-rep-mode`} className={compact ? 'h-9' : undefined}>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="reps">Reps</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                </SelectContent>
              </Select>
              {!compact ? (
                <FieldHint>
                  Time for holds and carries; distance for runs, rows, and sled work.
                </FieldHint>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reps"
          render={({ field }) => (
            <FormItem className={compact ? 'col-span-2' : 'sm:col-span-2'}>
              <FormLabel>
                {repMode === 'time'
                  ? 'Duration'
                  : repMode === 'distance'
                    ? 'Distance'
                    : customRepsActive
                      ? 'Reps per set'
                      : 'Reps'}
              </FormLabel>
              <FormControl>
                {repMode === 'reps' && customRepsActive ? (
                  <CustomRepsEditor
                    compact={compact}
                    setCount={setCount}
                    values={perSetReps}
                    onChange={updatePerSetReps}
                    onUseSameReps={exitCustomReps}
                  />
                ) : (
                  <Input
                    className={compact ? 'h-9' : undefined}
                    placeholder={
                      repMode === 'time'
                        ? '30s, 1:00'
                        : repMode === 'distance'
                          ? '400m, 5k, 1mi'
                          : compact
                            ? '10, 10-12'
                            : '10, 10-12, F for to failure, C for custom'
                    }
                    {...field}
                    onChange={(event) => {
                      field.onChange(event)
                      if (
                        repMode === 'reps' &&
                        isCustomRepsShortcut(event.target.value)
                      ) {
                        activateCustomReps()
                      }
                    }}
                    onBlur={(event) => {
                      field.onBlur()
                      if (repMode === 'reps') {
                        if (isCustomRepsShortcut(event.target.value)) {
                          activateCustomReps()
                          return
                        }
                        const normalized = normalizeRepsInput(event.target.value)
                        if (normalized !== event.target.value.trim()) {
                          field.onChange(normalized)
                        }
                      }
                    }}
                  />
                )}
              </FormControl>
              {!compact ? (
                <FieldHint>
                  {repMode === 'time'
                    ? 'Seconds or mm:ss.'
                    : repMode === 'distance'
                      ? 'Meters (m), kilometers (k/km), or miles (mi).'
                      : customRepsActive
                        ? 'Enter a target for each set. Values are saved as a custom prescription.'
                        : 'Use F for to failure, C for a custom target per set.'}
                </FieldHint>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        {compact ? (
          <>
            <FormField
              control={form.control}
              name="exerciseBlock"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Section</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === '__none__' ? '' : value)
                    }
                    value={field.value || '__none__'}
                  >
                    <FormControl>
                      <SelectTrigger id={`${idPrefix}-exercise-block`} className="h-9">
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
                  <FormMessage />
                </FormItem>
              )}
            />
            {!hideSupersetGroup ? (
            <FormField
              control={form.control}
              name="supersetGroup"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Superset group</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === '__none__' ? '' : value)
                    }
                    value={field.value || '__none__'}
                  >
                    <FormControl>
                      <SelectTrigger id={`${idPrefix}-superset`} className="h-9">
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
                  <FieldHint>Same letter = performed back-to-back.</FieldHint>
                  <FormMessage />
                </FormItem>
              )}
            />
            ) : null}
          </>
        ) : null}
      </div>

      {!compact ? (
        <FormField
          control={form.control}
          name="eachSide"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
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
      ) : null}

      {!compact ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="weightPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight % of 1RM</FormLabel>
                  <FormControl>
                    <Input placeholder="75 or 70-80" {...field} />
                  </FormControl>
                  <FieldHint>
                    Prescribe load as a percentage of the client&apos;s best e1RM.
                  </FieldHint>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target weight</FormLabel>
                  <FormControl>
                    <Input placeholder="185" {...field} />
                  </FormControl>
                  <FieldHint>
                    Absolute load for this session. Overrides auto-progress suggestions.
                  </FieldHint>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rpeTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RPE target</FormLabel>
                  <FormControl>
                    <Input placeholder="8 or 7-8" {...field} />
                  </FormControl>
                  <FieldHint>Target effort for working sets (1–10 scale).</FieldHint>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4 rounded-lg border p-4">
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

            {!hideSupersetGroup ? (
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
            ) : null}
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
                <FormLabel>Additional notes</FormLabel>
                <FormControl>
                  <Input placeholder="Cluster sets, band-assisted, pause reps…" {...field} />
                </FormControl>
                <FieldHint>Extra coaching cues shown in the workout summary.</FieldHint>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3 rounded-lg border p-4">
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
                        'flex flex-row items-start gap-3 rounded-lg border p-3',
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
        </>
      ) : (
        <details className="mt-auto shrink-0 rounded-lg border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            More options
          </summary>
          <div className="mt-3 space-y-3">
            <FormField
              control={form.control}
              name="workoutNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      maxLength={255}
                      placeholder="Session-only cues"
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eachSide"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <input
                      id={`${idPrefix}-each-side`}
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="size-4 rounded border"
                    />
                  </FormControl>
                  <FormLabel htmlFor={`${idPrefix}-each-side`} className="font-normal">
                    Each side
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="weightPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight %</FormLabel>
                    <FormControl>
                      <Input className="h-9" placeholder="75" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rpeTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RPE</FormLabel>
                    <FormControl>
                      <Input className="h-9" placeholder="8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tempo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo</FormLabel>
                    <FormControl>
                      <Input className="h-9" placeholder="3-0-1-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="restSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rest (sec)</FormLabel>
                    <FormControl>
                      <Input className="h-9" placeholder="90" {...field} />
                    </FormControl>
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
                  <FormLabel>Additional notes</FormLabel>
                  <FormControl>
                    <Input className="h-9" placeholder="Cluster sets, pause reps…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              {TRACKING_TOGGLES.map(({ key, label }) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={`trackingOptions.${key}`}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={Boolean(field.value)}
                          onChange={(event) => field.onChange(event.target.checked)}
                          className="size-4 rounded border"
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal">{label}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  )
}
