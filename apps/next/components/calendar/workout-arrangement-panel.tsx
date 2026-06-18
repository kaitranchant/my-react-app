'use client'

import * as React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  removeScheduledExercise,
  reorderScheduledExercises,
} from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { Button } from '@/components/ui/button'
import { getExerciseBlockLabel } from '@/lib/exercise-groups'
import { formatExercisePrescriptionSummary } from '@/lib/scheduled-exercise'
import { cn } from '@/lib/utils'
import type {
  ClientScheduledWorkoutWithExercises,
  ScheduledExerciseBlock,
} from 'app/types/database'

type ExerciseRow = ClientScheduledWorkoutWithExercises['exercises'][number]

type WorkoutSegment = {
  blockKey: string
  block: ScheduledExerciseBlock | null
  label: string
  exercises: ExerciseRow[]
}

const SECTION_PREFIX = 'section:'
const SUPERSET_COLORS: Record<string, string> = {
  A: 'bg-sky-500',
  B: 'bg-violet-500',
  C: 'bg-amber-500',
  D: 'bg-rose-500',
}

type WorkoutArrangementPanelProps = {
  clientId: string
  workout: ClientScheduledWorkoutWithExercises
  selectedRowId: string | null
  onSelectRow: (rowId: string | null) => void
  onChanged: () => void
}

function sectionLabel(block: ScheduledExerciseBlock | null): string {
  return getExerciseBlockLabel(block) ?? 'Exercises'
}

function sectionSortableId(blockKey: string) {
  return `${SECTION_PREFIX}${blockKey}`
}

function isSectionSortableId(id: string) {
  return id.startsWith(SECTION_PREFIX)
}

function parseSectionSortableId(id: string) {
  return id.slice(SECTION_PREFIX.length)
}

function buildSegmentsFromExercises(exercises: ExerciseRow[]): WorkoutSegment[] {
  const segments: WorkoutSegment[] = []

  for (const row of exercises) {
    const block = row.exercise_block ?? null
    const blockKey = block ?? '__none__'
    const last = segments[segments.length - 1]

    if (!last || last.blockKey !== blockKey) {
      segments.push({
        blockKey,
        block,
        label: sectionLabel(block),
        exercises: [row],
      })
    } else {
      last.exercises.push(row)
    }
  }

  return segments
}

function flattenSegments(segments: WorkoutSegment[]): ExerciseRow[] {
  return segments.flatMap((segment) => segment.exercises)
}

type SortableExerciseItemProps = {
  row: ExerciseRow
  selected: boolean
  pending: boolean
  onSelect: () => void
  onRemove: () => void
}

function SortableExerciseItem({
  row,
  selected,
  pending,
  onSelect,
  onRemove,
}: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const summary = formatExercisePrescriptionSummary(row)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-1.5 px-2 py-2 transition-colors',
        isDragging && 'bg-muted/60 z-10 rounded-md shadow-sm',
        selected && !isDragging
          ? 'bg-brand/10 ring-brand ring-1 ring-inset'
          : !isDragging && 'hover:bg-muted/40'
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground mt-1.5 shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label="Drag to reorder exercise"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-start gap-2">
          {row.superset_group && (
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                SUPERSET_COLORS[row.superset_group] ?? 'bg-muted-foreground'
              )}
            >
              {row.superset_group}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{row.exercise.name}</p>
            <p className="text-muted-foreground truncate text-xs">{summary}</p>
          </div>
        </div>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        disabled={pending}
        onClick={onRemove}
        aria-label="Remove"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

type SortableSectionProps = {
  segment: WorkoutSegment
  collapsed: boolean
  draggable: boolean
  selectedRowId: string | null
  pendingId: string | null
  onToggle: () => void
  onSelectRow: (rowId: string) => void
  onRemove: (rowId: string) => void
}

function SortableSection({
  segment,
  collapsed,
  draggable,
  selectedRowId,
  pendingId,
  onToggle,
  onSelectRow,
  onRemove,
}: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sectionSortableId(segment.blockKey),
    disabled: !draggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const exerciseIds = segment.exercises.map((row) => row.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border',
        isDragging && 'ring-brand z-10 shadow-md ring-2'
      )}
    >
      <div className="bg-muted/40 flex items-center gap-1 px-1 py-1">
        {draggable && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none rounded p-1 active:cursor-grabbing"
            aria-label={`Drag ${segment.label} section`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="hover:bg-muted/60 flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
          ) : (
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
          )}
          <span className="truncate text-xs font-medium">
            {segment.label}
          </span>
          <span className="text-muted-foreground ml-auto shrink-0 text-[11px]">
            {segment.exercises.length}
          </span>
        </button>
      </div>

      {!collapsed && (
        <SortableContext
          items={exerciseIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="divide-y">
            {segment.exercises.map((row) => (
              <li key={row.id}>
                <SortableExerciseItem
                  row={row}
                  selected={selectedRowId === row.id}
                  pending={pendingId === row.id}
                  onSelect={() => onSelectRow(row.id)}
                  onRemove={() => onRemove(row.id)}
                />
              </li>
            ))}
          </ul>
        </SortableContext>
      )}
    </div>
  )
}

export function WorkoutArrangementPanel({
  clientId,
  workout,
  selectedRowId,
  onSelectRow,
  onChanged,
}: WorkoutArrangementPanelProps) {
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [reordering, setReordering] = React.useState(false)
  const [collapsedBlocks, setCollapsedBlocks] = React.useState<Set<string>>(
    new Set()
  )

  const sortedExercises = React.useMemo(
    () =>
      [...workout.exercises].sort((a, b) => a.sort_order - b.sort_order),
    [workout.exercises]
  )

  const [localSegments, setLocalSegments] = React.useState<WorkoutSegment[]>(() =>
    buildSegmentsFromExercises(sortedExercises)
  )

  React.useEffect(() => {
    setLocalSegments(buildSegmentsFromExercises(sortedExercises))
  }, [sortedExercises])

  const sectionIds = React.useMemo(
    () => localSegments.map((segment) => sectionSortableId(segment.blockKey)),
    [localSegments]
  )

  const showSectionHeaders =
    localSegments.length > 1 || localSegments[0]?.block !== null
  const sectionsDraggable = showSectionHeaders && localSegments.length > 1

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function toggleBlock(blockKey: string) {
    setCollapsedBlocks((current) => {
      const next = new Set(current)
      if (next.has(blockKey)) {
        next.delete(blockKey)
      } else {
        next.add(blockKey)
      }
      return next
    })
  }

  function findSegmentIndex(segments: WorkoutSegment[], exerciseId: string) {
    return segments.findIndex((segment) =>
      segment.exercises.some((row) => row.id === exerciseId)
    )
  }

  function resolveTargetSectionKey(overId: string): string | null {
    if (isSectionSortableId(overId)) {
      return parseSectionSortableId(overId)
    }

    const segmentIndex = findSegmentIndex(localSegments, overId)
    if (segmentIndex < 0) return null
    return localSegments[segmentIndex].blockKey
  }

  async function persistSegments(nextSegments: WorkoutSegment[]) {
    const nextIds = flattenSegments(nextSegments).map((row) => row.id)

    setLocalSegments(nextSegments)
    setReordering(true)

    const result = await reorderScheduledExercises(
      clientId,
      workout.id,
      nextIds
    )
    setReordering(false)

    if (result.success) {
      onChanged()
      return true
    }

    toast.error(result.error)
    setLocalSegments(buildSegmentsFromExercises(sortedExercises))
    return false
  }

  async function handleRemove(rowId: string) {
    setPendingId(rowId)
    const result = await removeScheduledExercise(clientId, rowId)
    setPendingId(null)

    if (result.success) {
      toast.success('Exercise removed.')
      if (selectedRowId === rowId) onSelectRow(null)
      onChanged()
      return
    }
    toast.error(result.error)
  }

  function moveExerciseInSegments(
    segments: WorkoutSegment[],
    activeId: string,
    overId: string
  ): WorkoutSegment[] | null {
    const activeSegmentIndex = findSegmentIndex(segments, activeId)
    if (activeSegmentIndex < 0) return null

    let overSegmentIndex = findSegmentIndex(segments, overId)
    if (overSegmentIndex < 0 && isSectionSortableId(overId)) {
      overSegmentIndex = segments.findIndex(
        (segment) => segment.blockKey === parseSectionSortableId(overId)
      )
    }
    if (overSegmentIndex < 0) return null

    const nextSegments = segments.map((segment) => ({
      ...segment,
      exercises: [...segment.exercises],
    }))

    if (activeSegmentIndex === overSegmentIndex) {
      const segment = nextSegments[activeSegmentIndex]
      const oldIndex = segment.exercises.findIndex((row) => row.id === activeId)
      const newIndex = segment.exercises.findIndex((row) => row.id === overId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return null
      segment.exercises = arrayMove(segment.exercises, oldIndex, newIndex)
      return nextSegments
    }

    const fromSegment = nextSegments[activeSegmentIndex]
    const toSegment = nextSegments[overSegmentIndex]
    const fromIndex = fromSegment.exercises.findIndex((row) => row.id === activeId)
    if (fromIndex < 0) return null

    const [moved] = fromSegment.exercises.splice(fromIndex, 1)

    if (isSectionSortableId(overId)) {
      toSegment.exercises.push(moved)
    } else {
      const toIndex = toSegment.exercises.findIndex((row) => row.id === overId)
      toSegment.exercises.splice(
        toIndex >= 0 ? toIndex : toSegment.exercises.length,
        0,
        moved
      )
    }

    return nextSegments
  }

  function handleSectionDrag(activeId: string, overId: string) {
    const activeKey = parseSectionSortableId(activeId)
    const overKey = resolveTargetSectionKey(overId)
    if (!overKey || activeKey === overKey) return

    const oldIndex = localSegments.findIndex(
      (segment) => segment.blockKey === activeKey
    )
    const newIndex = localSegments.findIndex(
      (segment) => segment.blockKey === overKey
    )
    if (oldIndex < 0 || newIndex < 0) return

    void persistSegments(arrayMove(localSegments, oldIndex, newIndex))
  }

  function handleExerciseDragEnd(activeId: string, overId: string) {
    if (activeId === overId) return

    const nextSegments = moveExerciseInSegments(localSegments, activeId, overId)
    if (!nextSegments) return

    void persistSegments(nextSegments)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    if (isSectionSortableId(activeId)) {
      handleSectionDrag(activeId, overId)
      return
    }

    handleExerciseDragEnd(activeId, overId)
  }

  if (localSegments.every((segment) => segment.exercises.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">
          No exercises yet. Pick one from the library to start building this session.
        </p>
      </div>
    )
  }

  if (!showSectionHeaders) {
    const exercises = localSegments.flatMap((segment) => segment.exercises)
    const exerciseIds = exercises.map((row) => row.id)

    return (
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          reordering && 'pointer-events-none opacity-70'
        )}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={exerciseIds}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y p-2">
              {exercises.map((row) => (
                <li key={row.id}>
                  <SortableExerciseItem
                    row={row}
                    selected={selectedRowId === row.id}
                    pending={pendingId === row.id}
                    onSelect={() => onSelectRow(row.id)}
                    onRemove={() => handleRemove(row.id)}
                  />
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto',
        reordering && 'pointer-events-none opacity-70'
      )}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sectionIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 p-2">
            {localSegments.map((segment) => (
              <SortableSection
                key={segment.blockKey}
                segment={segment}
                collapsed={collapsedBlocks.has(segment.blockKey)}
                draggable={sectionsDraggable}
                selectedRowId={selectedRowId}
                pendingId={pendingId}
                onToggle={() => toggleBlock(segment.blockKey)}
                onSelectRow={onSelectRow}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="px-3 pb-3">
        <p className="text-muted-foreground text-[11px]">
          Drag section headers or individual exercises to reorder. New exercises
          are placed in their section automatically.
        </p>
      </div>
    </div>
  )
}
