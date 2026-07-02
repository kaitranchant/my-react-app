'use client'

import * as React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
  Layers,
  Link2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getExerciseBlockLabel } from '@/lib/exercise-groups'
import { formatExercisePrescriptionSummary } from '@/lib/scheduled-exercise'
import {
  clusterExercisesBySuperset,
  getNextSupersetGroup,
  getSupersetColor,
  getSupersetFrameClasses,
  getUsedSupersetGroups,
  type SupersetCluster,
} from '@/lib/superset-groups'
import type {
  EditableWorkoutWithExercises,
  WorkoutBuilderExerciseActions,
} from '@/lib/workout-builder-types'
import { rowToPrescriptionValues } from '@/lib/validations/calendar'
import { useCoarsePointer } from '@/lib/hooks/use-coarse-pointer'
import { cn } from '@/lib/utils'
import type {
  ScheduledExerciseBlock,
  ScheduledWorkoutExerciseWithDetails,
} from 'app/types/database'

type ExerciseRow = ScheduledWorkoutExerciseWithDetails

type WorkoutSegment = {
  blockKey: string
  block: ScheduledExerciseBlock | null
  label: string
  exercises: ExerciseRow[]
}

const SECTION_PREFIX = 'section:'

type WorkoutArrangementPanelProps = {
  workout: EditableWorkoutWithExercises
  exerciseActions: Pick<
    WorkoutBuilderExerciseActions,
    'removeExercise' | 'reorderExercises' | 'updateExercise'
  >
  selectedRowId: string | null
  onSelectRow: (rowId: string | null) => void
  onChanged: () => void
  onStartSuperset?: () => void
  activeSupersetGroup?: string | null
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

function removeExerciseFromSegments(
  segments: WorkoutSegment[],
  rowId: string
): WorkoutSegment[] {
  return segments
    .map((segment) => ({
      ...segment,
      exercises: segment.exercises.filter((row) => row.id !== rowId),
    }))
    .filter((segment) => segment.exercises.length > 0)
}

type SortableExerciseItemProps = {
  row: ExerciseRow
  selected: boolean
  pending: boolean
  showSupersetBadge?: boolean
  usedSupersetGroups: string[]
  onSelect: () => void
  onRemove: () => void
  onAssignSuperset: (group: string | null) => void
}

function SortableExerciseItem({
  row,
  selected,
  pending,
  showSupersetBadge = true,
  usedSupersetGroups,
  onSelect,
  onRemove,
  onAssignSuperset,
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
          {showSupersetBadge && row.superset_group && (
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                getSupersetColor(row.superset_group)
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            disabled={pending}
            aria-label="Superset options"
          >
            <Link2 className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {row.superset_group ? (
            <DropdownMenuItem onClick={() => onAssignSuperset(null)}>
              Remove from superset
            </DropdownMenuItem>
          ) : null}
          {usedSupersetGroups
            .filter((group) => group !== row.superset_group)
            .map((group) => (
              <DropdownMenuItem key={group} onClick={() => onAssignSuperset(group)}>
                Join superset {group}
              </DropdownMenuItem>
            ))}
          {!row.superset_group ? (
            <>
              {usedSupersetGroups.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={() => onAssignSuperset('__new__')}>
                Create new superset
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

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

type ExerciseClusterListProps = {
  exercises: ExerciseRow[]
  selectedRowId: string | null
  pendingId: string | null
  usedSupersetGroups: string[]
  onSelectRow: (rowId: string) => void
  onRemove: (rowId: string) => void
  onAssignSuperset: (rowId: string, group: string | null) => void
  allExercises: ExerciseRow[]
}

function ExerciseClusterList({
  exercises,
  selectedRowId,
  pendingId,
  usedSupersetGroups,
  onSelectRow,
  onRemove,
  onAssignSuperset,
  allExercises,
}: ExerciseClusterListProps) {
  const clusters = clusterExercisesBySuperset(exercises)
  const exerciseIds = exercises.map((row) => row.id)

  function handleAssign(rowId: string, group: string | null) {
    if (group === '__new__') {
      onAssignSuperset(rowId, getNextSupersetGroup(allExercises))
      return
    }
    onAssignSuperset(rowId, group)
  }

  function renderCluster(cluster: SupersetCluster<ExerciseRow>, index: number) {
    if (cluster.type === 'single') {
      return (
        <li key={cluster.exercise.id} className="rounded-md border border-border/50">
          <SortableExerciseItem
            row={cluster.exercise}
            selected={selectedRowId === cluster.exercise.id}
            pending={pendingId === cluster.exercise.id}
            usedSupersetGroups={usedSupersetGroups}
            onSelect={() => onSelectRow(cluster.exercise.id)}
            onRemove={() => onRemove(cluster.exercise.id)}
            onAssignSuperset={(group) => handleAssign(cluster.exercise.id, group)}
          />
        </li>
      )
    }

    return (
      <li key={`superset-${cluster.group}-${index}`} className="py-0.5">
        <div
          className={cn(
            'overflow-hidden rounded-lg border-2 shadow-sm ring-1 ring-inset',
            getSupersetFrameClasses(cluster.group)
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between gap-2 px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-white uppercase',
              getSupersetColor(cluster.group)
            )}
          >
            <span>Superset {cluster.group}</span>
            <span className="font-medium normal-case tracking-normal opacity-90">
              {cluster.exercises.length}{' '}
              {cluster.exercises.length === 1 ? 'exercise' : 'exercises'}
            </span>
          </div>
          <ul className="divide-y divide-border/70 bg-background/40">
            {cluster.exercises.map((row) => (
              <li key={row.id}>
                <SortableExerciseItem
                  row={row}
                  selected={selectedRowId === row.id}
                  pending={pendingId === row.id}
                  showSupersetBadge={false}
                  usedSupersetGroups={usedSupersetGroups}
                  onSelect={() => onSelectRow(row.id)}
                  onRemove={() => onRemove(row.id)}
                  onAssignSuperset={(group) => handleAssign(row.id, group)}
                />
              </li>
            ))}
          </ul>
        </div>
      </li>
    )
  }

  return (
    <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
      <ul className="space-y-2">
        {clusters.map((cluster, index) => renderCluster(cluster, index))}
      </ul>
    </SortableContext>
  )
}

type ArrangementToolbarProps = {
  onStartSuperset?: () => void
  activeSupersetGroup?: string | null
}

function ArrangementToolbar({
  onStartSuperset,
  activeSupersetGroup,
}: ArrangementToolbarProps) {
  if (!onStartSuperset) return null

  return (
    <div className="flex shrink-0 items-center gap-2 border-b px-2 py-2">
      <Button
        type="button"
        variant={activeSupersetGroup ? 'default' : 'outline'}
        size="sm"
        className="h-8 flex-1 text-xs"
        onClick={onStartSuperset}
      >
        <Layers className="size-3.5" />
        {activeSupersetGroup
          ? `Superset ${activeSupersetGroup}…`
          : 'Add superset'}
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
  usedSupersetGroups: string[]
  allExercises: ExerciseRow[]
  onToggle: () => void
  onSelectRow: (rowId: string) => void
  onRemove: (rowId: string) => void
  onAssignSuperset: (rowId: string, group: string | null) => void
}

function SortableSection({
  segment,
  collapsed,
  draggable,
  selectedRowId,
  pendingId,
  usedSupersetGroups,
  allExercises,
  onToggle,
  onSelectRow,
  onRemove,
  onAssignSuperset,
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
        <ExerciseClusterList
          exercises={segment.exercises}
          selectedRowId={selectedRowId}
          pendingId={pendingId}
          usedSupersetGroups={usedSupersetGroups}
          allExercises={allExercises}
          onSelectRow={onSelectRow}
          onRemove={onRemove}
          onAssignSuperset={onAssignSuperset}
        />
      )}
    </div>
  )
}

export function WorkoutArrangementPanel({
  workout,
  exerciseActions,
  selectedRowId,
  onSelectRow,
  onChanged,
  onStartSuperset,
  activeSupersetGroup,
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

  const usedSupersetGroups = React.useMemo(
    () => getUsedSupersetGroups(sortedExercises),
    [sortedExercises]
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

  const coarsePointer = useCoarsePointer()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: coarsePointer
        ? { delay: 250, tolerance: 8 }
        : { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
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

    const result = await exerciseActions.reorderExercises(
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
    const previousSegments = localSegments
    const nextSegments = removeExerciseFromSegments(localSegments, rowId)
    setLocalSegments(nextSegments)
    setPendingId(rowId)
    if (selectedRowId === rowId) onSelectRow(null)

    const result = await exerciseActions.removeExercise(rowId)
    setPendingId(null)

    if (result.success) {
      toast.success('Exercise removed.')
      void onChanged()
      return
    }

    setLocalSegments(previousSegments)
    toast.error(result.error)
  }

  async function handleAssignSuperset(rowId: string, group: string | null) {
    const row = sortedExercises.find((item) => item.id === rowId)
    if (!row) return

    setPendingId(rowId)
    const values = rowToPrescriptionValues(row)
    values.supersetGroup = group ?? ''
    const result = await exerciseActions.updateExercise(rowId, values)
    setPendingId(null)

    if (result.success) {
      toast.success(
        group ? `Added to superset ${group}.` : 'Removed from superset.'
      )
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
      <div className="flex min-h-0 flex-1 flex-col">
        <ArrangementToolbar
          onStartSuperset={onStartSuperset}
          activeSupersetGroup={activeSupersetGroup}
        />
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            No exercises yet. Pick one from the library or start a superset.
          </p>
        </div>
      </div>
    )
  }

  const panelBody = (children: React.ReactNode) => (
    <div className="flex min-h-0 flex-1 flex-col">
      <ArrangementToolbar
        onStartSuperset={onStartSuperset}
        activeSupersetGroup={activeSupersetGroup}
      />
      {children}
    </div>
  )

  if (!showSectionHeaders) {
    const exercises = localSegments.flatMap((segment) => segment.exercises)

    return panelBody(
      <div
        className={cn(
          'min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain',
          reordering && 'pointer-events-none opacity-70'
        )}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="p-2">
            <ExerciseClusterList
              exercises={exercises}
              selectedRowId={selectedRowId}
              pendingId={pendingId}
              usedSupersetGroups={usedSupersetGroups}
              allExercises={sortedExercises}
              onSelectRow={onSelectRow}
              onRemove={handleRemove}
              onAssignSuperset={handleAssignSuperset}
            />
          </div>
        </DndContext>
      </div>
    )
  }

  return panelBody(
    <div
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-y-contain',
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
                usedSupersetGroups={usedSupersetGroups}
                allExercises={sortedExercises}
                onToggle={() => toggleBlock(segment.blockKey)}
                onSelectRow={onSelectRow}
                onRemove={handleRemove}
                onAssignSuperset={handleAssignSuperset}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="px-3 pb-3">
        <p className="text-muted-foreground text-[11px]">
          Drag to reorder. Use the link icon to join or create supersets. Exercises
          with the same letter are performed back-to-back.
        </p>
      </div>
    </div>
  )
}
