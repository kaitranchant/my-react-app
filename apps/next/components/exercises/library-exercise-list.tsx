'use client'

import * as React from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { exerciseDbImageUrl } from '@/lib/exercise-catalog'
import { cn } from '@/lib/utils'
import type { Exercise } from 'app/types/database'

type LibraryExerciseListProps = {
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  selectedId?: string | null
  onSelect: (exerciseId: string, name: string) => void
  variant?: 'list' | 'grid'
  className?: string
  emptyMessage?: string
}

export function LibraryExerciseList({
  exercises,
  selectedId = null,
  onSelect,
  variant = 'list',
  className,
  emptyMessage = 'No exercises match your search.',
}: LibraryExerciseListProps) {
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return exercises

    return exercises.filter((exercise) => {
      const haystack = [exercise.name, exercise.muscle_group ?? '']
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [exercises, query])

  return (
    <div className={cn('flex min-h-0 flex-col gap-2', className)}>
      <div className="relative shrink-0">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search library…"
          className="h-9 pl-8 text-sm"
        />
      </div>

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto rounded-lg border',
          variant === 'grid' ? 'p-2' : ''
        )}
      >
        {filtered.length === 0 ? (
          <p className="text-muted-foreground px-4 py-12 text-center text-sm">
            {emptyMessage}
          </p>
        ) : variant === 'grid' ? (
          <ul className="grid grid-cols-2 gap-2">
            {filtered.map((exercise) => {
              const selected = selectedId === exercise.id
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(exercise.id, exercise.name)}
                    className={cn(
                      'hover:bg-muted/50 flex w-full flex-col overflow-hidden rounded-md border text-left transition-colors',
                      selected && 'border-brand bg-brand/10 ring-brand ring-1'
                    )}
                  >
                    {exercise.external_id ? (
                      <div className="bg-muted aspect-[4/3] w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={exerciseDbImageUrl(exercise.external_id)}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="space-y-0.5 p-2">
                      <p className="line-clamp-2 text-xs font-medium leading-snug">
                        {exercise.name}
                      </p>
                      {exercise.muscle_group ? (
                        <p className="text-muted-foreground line-clamp-1 text-[10px]">
                          {exercise.muscle_group}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <ul className="divide-y">
            {filtered.map((exercise) => {
              const selected = selectedId === exercise.id
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(exercise.id, exercise.name)}
                    className={cn(
                      'hover:bg-muted/50 flex w-full items-start gap-2 px-2 py-2 text-left transition-colors sm:gap-3 sm:px-3 sm:py-3',
                      selected && 'bg-brand/10 ring-brand ring-1 ring-inset'
                    )}
                  >
                    {exercise.external_id ? (
                      <div className="bg-muted size-10 shrink-0 overflow-hidden rounded-lg sm:size-12">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={exerciseDbImageUrl(exercise.external_id)}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{exercise.name}</p>
                      {exercise.muscle_group ? (
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {exercise.muscle_group}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
