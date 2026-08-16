'use client'

import * as React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Activity, Dumbbell, Layers, Target, Timer } from 'lucide-react'

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
import { DEFAULT_TRACKING_OPTIONS } from '@/lib/scheduled-exercise'
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

const FIELD_FOCUS =
  'focus-visible:border-brand focus-visible:ring-brand/30'

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

function ToggleSwitch({
  id,
  checked,
  onCheckedChange,
  title,
}: {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  title?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:ring-brand/40 focus-visible:ring-2 focus-visible:outline-none',
        checked ? 'bg-brand' : 'bg-muted-foreground/30'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'bg-background absolute top-0.5 left-0.5 size-4 rounded-full shadow transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <FormDescription className="text-muted-foreground text-[11px] leading-snug">
      {children}
    </FormDescription>
  )
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="text-brand size-3.5 shrink-0" aria-hidden />
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </div>
  )
}

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border border-border/60 border-l-2 border-l-brand bg-muted/20 p-3.5',
        className
      )}
    >
      {children}
    </div>
  )
}

function CollapsibleSection({
  icon,
  title,
  description,
  defaultOpen,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <details
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open)
      }}
      className="group rounded-lg border border-border/60 border-l-2 border-l-brand bg-muted/20"
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <SectionHeader icon={icon} title={title} />
          <span className="text-muted-foreground ml-auto shrink-0 text-[11px]">
            <span className="group-open:hidden">Show</span>
            <span className="hidden group-open:inline">Hide</span>
          </span>
        </div>
        {description ? (
          <p className="text-muted-foreground mt-0.5 pl-[1.375rem] text-[11px] leading-snug">
            {description}
          </p>
        ) : null}
      </summary>
      <div className="space-y-3 border-t border-border/50 px-3 py-3">{children}</div>
    </details>
  )
}

function trackingDiffersFromDefault(
  options: ScheduledExercisePrescriptionValues['trackingOptions']
) {
  return (Object.keys(DEFAULT_TRACKING_OPTIONS) as TrackingOptionKey[]).some(
    (key) => Boolean(options[key]) !== Boolean(DEFAULT_TRACKING_OPTIONS[key])
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
              className={cn(compact ? 'h-9' : undefined, !compact && FIELD_FOCUS)}
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
  const exerciseBlock = form.watch('exerciseBlock')
  const supersetGroup = form.watch('supersetGroup')
  const tempo = form.watch('tempo')
  const restSeconds = form.watch('restSeconds')
  const prescription = form.watch('prescription')
  const trackingOptions = form.watch('trackingOptions')
  const setCount = getPrescriptionSetCount(setsValue)
  const [customRepsActive, setCustomRepsActive] = React.useState(false)
  const [perSetReps, setPerSetReps] = React.useState<string[]>(() =>
    resizePerSetReps([], setCount)
  )

  const openStructure =
    Boolean(exerciseBlock?.trim()) || Boolean(supersetGroup?.trim())
  const openTempoRest =
    Boolean(tempo?.trim()) ||
    Boolean(restSeconds?.trim()) ||
    Boolean(prescription?.trim())
  const openTracking = trackingDiffersFromDefault(trackingOptions)

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
    <div className={cn(compact ? 'flex min-h-0 flex-1 flex-col space-y-3' : 'space-y-2.5')}>
      {!compact ? (
        <SectionCard>
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
                    placeholder="Cues, substitutions, etc."
                    className={FIELD_FOCUS}
                    {...field}
                  />
                </FormControl>
                <FieldHint>Shown to the client for this workout only.</FieldHint>
                <FormMessage />
              </FormItem>
            )}
          />
        </SectionCard>
      ) : null}

      {!compact ? (
        <SectionCard>
          <SectionHeader icon={Dumbbell} title="Sets & reps" />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="sets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sets</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger
                        id={`${idPrefix}-sets`}
                        className={FIELD_FOCUS}
                      >
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
                  <FormLabel>Reps, time, or distance</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger
                        id={`${idPrefix}-rep-mode`}
                        className={FIELD_FOCUS}
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="reps">Reps</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="distance">Distance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldHint>
                    Time for holds and carries; distance for runs, rows, and sled work.
                  </FieldHint>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reps"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
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
                        compact={false}
                        setCount={setCount}
                        values={perSetReps}
                        onChange={updatePerSetReps}
                        onUseSameReps={exitCustomReps}
                      />
                    ) : (
                      <Input
                        className={FIELD_FOCUS}
                        placeholder={
                          repMode === 'time'
                            ? '30s, 1:00'
                            : repMode === 'distance'
                              ? '400m, 5k, 1mi'
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
                  <FieldHint>
                    {repMode === 'time'
                      ? 'Seconds or mm:ss.'
                      : repMode === 'distance'
                        ? 'Meters (m), kilometers (k/km), or miles (mi).'
                        : customRepsActive
                          ? 'Enter a target for each set. Values are saved as a custom prescription.'
                          : 'Use F for to failure, C for a custom target per set.'}
                  </FieldHint>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="eachSide"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-3 rounded-md border border-border/50 px-3 py-2 sm:col-span-2">
                  <div className="min-w-0 space-y-0.5">
                    <FormLabel
                      htmlFor={`${idPrefix}-each-side`}
                      className="font-medium"
                    >
                      Each side
                    </FormLabel>
                    <p className="text-muted-foreground text-[11px] leading-snug">
                      Left and right — common for unilateral work.
                    </p>
                  </div>
                  <FormControl>
                    <ToggleSwitch
                      id={`${idPrefix}-each-side`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      title="Left and right — common for unilateral work."
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </SectionCard>
      ) : (
        <div className="grid shrink-0 grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="sets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sets</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger id={`${idPrefix}-sets`} className="h-9">
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
                    <SelectTrigger id={`${idPrefix}-rep-mode`} className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="reps">Reps</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="distance">Distance</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reps"
            render={({ field }) => (
              <FormItem className="col-span-2">
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
                      compact
                      setCount={setCount}
                      values={perSetReps}
                      onChange={updatePerSetReps}
                      onUseSameReps={exitCustomReps}
                    />
                  ) : (
                    <Input
                      className="h-9"
                      placeholder={
                        repMode === 'time'
                          ? '30s, 1:00'
                          : repMode === 'distance'
                            ? '400m, 5k, 1mi'
                            : '10, 10-12'
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
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>
      )}

      {!compact ? (
        <>
          <SectionCard>
            <SectionHeader icon={Target} title="Load" />
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="weightPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight % of 1RM</FormLabel>
                    <FormControl>
                      <Input
                        className={FIELD_FOCUS}
                        placeholder="75 or 70-80"
                        {...field}
                      />
                    </FormControl>
                    <FieldHint>% of best e1RM.</FieldHint>
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
                      <Input className={FIELD_FOCUS} placeholder="185" {...field} />
                    </FormControl>
                    <FieldHint>Absolute load for this session.</FieldHint>
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
                      <Input
                        className={FIELD_FOCUS}
                        placeholder="8 or 7-8"
                        {...field}
                      />
                    </FormControl>
                    <FieldHint>Effort target (1–10).</FieldHint>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>

          <CollapsibleSection
            icon={Layers}
            title="Workout structure"
            description="Section placement and how this exercise pairs with others."
            defaultOpen={openStructure}
          >
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
                      <SelectTrigger
                        id={`${idPrefix}-exercise-block`}
                        className={FIELD_FOCUS}
                      >
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
                      ? EXERCISE_BLOCK_OPTIONS.find(
                          (option) => option.value === selectedBlock
                        )?.description
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
                      onValueChange={(value) =>
                        field.onChange(value === '__none__' ? '' : value)
                      }
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger
                          id={`${idPrefix}-superset`}
                          className={FIELD_FOCUS}
                        >
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
          </CollapsibleSection>

          <CollapsibleSection
            icon={Timer}
            title="Tempo & rest"
            description="Timing cues and extra coaching notes."
            defaultOpen={openTempoRest}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tempo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo</FormLabel>
                    <FormControl>
                      <Input
                        className={FIELD_FOCUS}
                        placeholder="3-0-1-0"
                        {...field}
                      />
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
                      <Input className={FIELD_FOCUS} placeholder="90" {...field} />
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
                    <Input
                      className={FIELD_FOCUS}
                      placeholder="Cluster sets, band-assisted, pause reps…"
                      {...field}
                    />
                  </FormControl>
                  <FieldHint>Extra coaching cues shown in the workout summary.</FieldHint>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={Activity}
            title="Logging & tracking"
            description="How this exercise is tracked when clients log workouts."
            defaultOpen={openTracking}
          >
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {TRACKING_TOGGLES.map(({ key, label, description }) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={`trackingOptions.${key}`}
                  render={({ field }) => (
                    <FormItem
                      className={cn(
                        'flex flex-row items-center gap-2 rounded-md border border-transparent px-2 py-1.5',
                        field.value && 'border-brand/40 bg-brand/5'
                      )}
                      title={description}
                    >
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={Boolean(field.value)}
                          onChange={(event) => field.onChange(event.target.checked)}
                          className="size-3.5 shrink-0 rounded border"
                          title={description}
                        />
                      </FormControl>
                      <FormLabel
                        className="cursor-pointer text-xs font-normal leading-tight"
                        title={description}
                      >
                        {label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </CollapsibleSection>
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
                      className="text-base"
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
                    <Input
                      className="h-9"
                      placeholder="Cluster sets, pause reps…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              {TRACKING_TOGGLES.map(({ key, label, description }) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={`trackingOptions.${key}`}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2" title={description}>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={Boolean(field.value)}
                          onChange={(event) => field.onChange(event.target.checked)}
                          className="size-4 rounded border"
                          title={description}
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal" title={description}>
                        {label}
                      </FormLabel>
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
