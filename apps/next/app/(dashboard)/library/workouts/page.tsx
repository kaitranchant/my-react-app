import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddWorkoutButton } from '@/components/workouts/workout-form-dialog'
import { WorkoutRowActions } from '@/components/workouts/workout-row-actions'
import { WorkoutStatusBadge } from '@/components/workouts/workout-status-badge'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import { workoutStatuses } from '@/lib/validations/workout'
import type { Workout, WorkoutStatus } from 'app/types/database'

export const metadata = {
  title: 'Workouts — Library — Coaching App',
}

function isStatus(value: string): value is WorkoutStatus {
  return (workoutStatuses as readonly string[]).includes(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function LibraryWorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('workouts')
    .select('*')
    .order('updated_at', { ascending: false })

  if (status && isStatus(status)) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  const { data, error } = await queryBuilder
  const workouts = (data ?? []) as Workout[]

  const statusFilters: { label: string; value?: WorkoutStatus }[] = [
    { label: 'All' },
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Session templates — combine exercises into reusable workouts.
        </p>
        <AddWorkoutButton />
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const active = filter.value ? status === filter.value : !status
          const href = filter.value
            ? `/library/workouts?status=${filter.value}`
            : '/library/workouts'
          return (
            <Link
              key={filter.label}
              href={href}
              className={
                active
                  ? 'bg-foreground text-background inline-flex rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide'
                  : 'text-muted-foreground hover:text-foreground border inline-flex rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors'
              }
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">
            {workouts.length} workout{workouts.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <LibraryLoadError resource="workouts" error={error} />
          ) : workouts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="bg-foreground text-background flex size-14 items-center justify-center rounded-sm">
                <Dumbbell className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No workouts yet</p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  {status
                    ? 'No workouts match this filter.'
                    : 'Create your first workout template.'}
                </p>
              </div>
              {!status && (
                <div className="pt-2">
                  <AddWorkoutButton />
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {workouts.map((workout) => (
                  <TableRow key={workout.id} className="group">
                    <TableCell className="pl-5">
                      <div className="space-y-0.5">
                        <p className="font-medium">{workout.name}</p>
                        {workout.description && (
                          <p className="text-muted-foreground max-w-md truncate text-xs">
                            {workout.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <WorkoutStatusBadge status={workout.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(workout.updated_at)}
                    </TableCell>
                    <TableCell className="pr-5">
                      <WorkoutRowActions workout={workout} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
