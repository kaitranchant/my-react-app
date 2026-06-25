'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { ExerciseDetailDialog } from '@/components/exercises/exercise-detail-dialog'
import { ExerciseRowActions } from '@/components/exercises/exercise-row-actions'
import { ExerciseSourceBadge } from '@/components/exercises/exercise-source-badge'
import { ExerciseStatusBadge } from '@/components/exercises/exercise-status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getExerciseLibrarySortHref,
  type ExerciseLibraryListState,
} from '@/lib/exercise-library-url'
import type { ExerciseLibrarySort } from '@/lib/validations/exercise'
import { cn } from '@/lib/utils'
import type { Exercise } from 'app/types/database'

type ExerciseLibraryTableProps = {
  exercises: Exercise[]
  listState: ExerciseLibraryListState
}

function SortHeaderLink({
  label,
  column,
  listState,
}: {
  label: string
  column: ExerciseLibrarySort
  listState: ExerciseLibraryListState
}) {
  const isActive = listState.sort === column
  const Icon = !isActive
    ? ArrowUpDown
    : listState.dir === 'asc'
      ? ArrowUp
      : ArrowDown

  return (
    <Link
      href={getExerciseLibrarySortHref(listState, column)}
      className="hover:text-foreground inline-flex items-center gap-1 font-medium"
      aria-sort={
        isActive
          ? listState.dir === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      {label}
      <Icon className="size-3.5 opacity-60" aria-hidden />
    </Link>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ExerciseLibraryTable({
  exercises,
  listState,
}: ExerciseLibraryTableProps) {
  const [selectedExerciseId, setSelectedExerciseId] = React.useState<
    string | null
  >(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  function openExercise(exerciseId: string) {
    setSelectedExerciseId(exerciseId)
    setDetailOpen(true)
  }

  return (
    <>
      <ul className="divide-y md:hidden">
        {exercises.map((exercise) => {
          const subtitle = [exercise.muscle_group, exercise.equipment]
            .filter(Boolean)
            .join(' · ')

          return (
            <li key={exercise.id}>
              <div
                className="hover:bg-muted/30 flex cursor-pointer items-center gap-2 px-4 py-2.5 transition-colors"
                onClick={() => openExercise(exercise.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-medium leading-snug">
                      {exercise.name}
                    </p>
                    <ExerciseSourceBadge source={exercise.source} />
                    {exercise.status === 'archived' ? (
                      <ExerciseStatusBadge status={exercise.status} />
                    ) : null}
                  </div>
                  {subtitle ? (
                    <p
                      className="text-muted-foreground line-clamp-1 text-xs leading-snug"
                      title={subtitle}
                    >
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                <div
                  className="shrink-0"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExerciseRowActions exercise={exercise} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <Table className="hidden table-fixed md:table">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[24%] pl-5">
              <SortHeaderLink
                label="Name"
                column="name"
                listState={listState}
              />
            </TableHead>
            <TableHead className="w-[32%]">Muscle group</TableHead>
            <TableHead className="w-[18%]">Equipment</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[12%]">Updated</TableHead>
            <TableHead className="w-12 pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow
              key={exercise.id}
              className="group cursor-pointer"
              onClick={() => openExercise(exercise.id)}
            >
              <TableCell className="max-w-0 whitespace-normal pl-5">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-medium">{exercise.name}</p>
                  <ExerciseSourceBadge source={exercise.source} />
                </div>
              </TableCell>
              <TableCell className="max-w-0 whitespace-normal">
                <span
                  className="text-muted-foreground line-clamp-2 break-words"
                  title={exercise.muscle_group ?? undefined}
                >
                  {exercise.muscle_group ?? '—'}
                </span>
              </TableCell>
              <TableCell className="max-w-0 truncate">
                <span
                  className="text-muted-foreground"
                  title={exercise.equipment ?? undefined}
                >
                  {exercise.equipment ?? '—'}
                </span>
              </TableCell>
              <TableCell>
                <ExerciseStatusBadge status={exercise.status} />
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatDate(exercise.updated_at)}
              </TableCell>
              <TableCell
                className={cn('pr-5')}
                onClick={(event) => event.stopPropagation()}
              >
                <ExerciseRowActions exercise={exercise} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ExerciseDetailDialog
        exerciseId={selectedExerciseId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  )
}
