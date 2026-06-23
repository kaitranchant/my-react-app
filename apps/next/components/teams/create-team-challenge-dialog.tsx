'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trophy } from 'lucide-react'
import { toast } from 'sonner'

import { createTeamChallenge } from '@/app/(dashboard)/teams/challenge-actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
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
import { toDateKey } from '@/lib/calendar'
import { LEADERBOARD_METRICS } from '@/lib/leaderboard'
import {
  challengeNeedsExercise,
  challengeSupportsFormula,
} from '@/lib/team-challenges'
import {
  teamChallengeFormSchema,
  teamChallengeMetrics,
  type TeamChallengeFormValues,
} from '@/lib/validations/team'

type CreateTeamChallengeDialogProps = {
  teamId: string
  exercises: { id: string; name: string }[]
  weightClasses?: string[]
  trigger?: React.ReactNode
}

function getDefaultChallengeDates() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end),
  }
}

export function CreateTeamChallengeDialog({
  teamId,
  exercises,
  weightClasses = [],
  trigger,
}: CreateTeamChallengeDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const defaults = React.useMemo(() => getDefaultChallengeDates(), [])

  const form = useForm<TeamChallengeFormValues>({
    resolver: zodResolver(teamChallengeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      metric: 'volume',
      exerciseId: 'none',
      formula: 'dots',
      weightClassFilter: '',
      startDate: defaults.startDate,
      endDate: defaults.endDate,
    },
  })

  const metric = form.watch('metric')
  const showExercise = challengeNeedsExercise(metric)
  const showFormula = challengeSupportsFormula(metric)

  React.useEffect(() => {
    if (!open) return
    const nextDefaults = getDefaultChallengeDates()
    form.reset({
      name: '',
      description: '',
      metric: 'volume',
      exerciseId: 'none',
      formula: 'dots',
      weightClassFilter: '',
      startDate: nextDefaults.startDate,
      endDate: nextDefaults.endDate,
    })
  }, [form, open])

  async function onSubmit(values: TeamChallengeFormValues) {
    setPending(true)
    const result = await createTeamChallenge(teamId, values)
    setPending(false)

    if (result.success) {
      toast.success('Challenge created as draft')
      setOpen(false)
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  const challengeMetricOptions = LEADERBOARD_METRICS.filter((entry) =>
    teamChallengeMetrics.includes(
      entry.id as (typeof teamChallengeMetrics)[number]
    )
  )

  const defaultTrigger = (
    <Button type="button" size="sm">
      <Trophy className="size-4" />
      New challenge
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create team challenge</DialogTitle>
          <DialogDescription>
            Set a time-boxed competition for your team. Publish it when you are
            ready for athletes to see the live standings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Challenge name</FormLabel>
                  <FormControl>
                    <Input placeholder="March volume challenge" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional details or rules for the team"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metric"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metric</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {challengeMetricOptions.map((entry) => (
                        <SelectItem key={entry.id} value={entry.id}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showExercise ? (
              <FormField
                control={form.control}
                name="exerciseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercise</FormLabel>
                    <Select value={field.value ?? 'none'} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exercise" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Select exercise</SelectItem>
                        {exercises.map((exercise) => (
                          <SelectItem key={exercise.id} value={exercise.id}>
                            {exercise.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {showFormula ? (
              <FormField
                control={form.control}
                name="formula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Formula</FormLabel>
                    <Select value={field.value ?? 'dots'} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dots">DOTS</SelectItem>
                        <SelectItem value="wilks">Wilks</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {weightClasses.length > 0 ? (
              <FormField
                control={form.control}
                name="weightClassFilter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight class</FormLabel>
                    <Select
                      value={field.value?.trim() ? field.value : 'all'}
                      onValueChange={(value) =>
                        field.onChange(value === 'all' ? '' : value)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All classes</SelectItem>
                        {weightClasses.map((weightClass) => (
                          <SelectItem key={weightClass} value={weightClass}>
                            {weightClass}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? 'Creating…' : 'Create draft'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
