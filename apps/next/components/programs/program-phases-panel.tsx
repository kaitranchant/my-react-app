'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Layers, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createProgramPhase,
  deleteProgramPhase,
  getProgramPhases,
  updateProgramPhase,
} from '@/app/(dashboard)/library/programs/[programId]/phases/actions'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '@/components/ui/textarea'
import {
  formatPhaseDayRange,
  formatPhaseDuration,
  getPhaseForDayOffset,
  getWeekIndexForDayOffset,
  offsetToDayNumber,
  suggestNextPhaseStartOffset,
} from '@/lib/program-calendar'
import {
  programPhaseFormSchema,
  type ProgramPhaseFormValues,
} from '@/lib/validations/program'
import { cn } from '@/lib/utils'
import type { ProgramPhase } from 'app/types/database'

type ProgramPhasesPanelProps = {
  programId: string
  phases: ProgramPhase[]
  onPhasesChange: (phases: ProgramPhase[]) => void
  schemaError?: string | null
  selectedDayOffset: number
  onJumpToWeek: (weekIndex: number) => void
}

const DEFAULT_PHASE_DURATION_DAYS = 28

function buildDefaultPhaseValues(phases: ProgramPhase[]): ProgramPhaseFormValues {
  const startOffset = suggestNextPhaseStartOffset(phases)
  const startDay = offsetToDayNumber(startOffset)
  const endDay = Math.min(
    365,
    offsetToDayNumber(startOffset + DEFAULT_PHASE_DURATION_DAYS - 1)
  )

  return {
    name: '',
    description: '',
    startDay,
    endDay,
  }
}

function phaseToFormValues(phase: ProgramPhase): ProgramPhaseFormValues {
  return {
    name: phase.name,
    description: phase.description ?? '',
    startDay: offsetToDayNumber(phase.start_day_offset),
    endDay: offsetToDayNumber(phase.end_day_offset),
  }
}

export function ProgramPhasesPanel({
  programId,
  phases,
  onPhasesChange,
  schemaError = null,
  selectedDayOffset,
  onJumpToWeek,
}: ProgramPhasesPanelProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingPhase, setEditingPhase] = React.useState<ProgramPhase | null>(
    null
  )
  const [pending, setPending] = React.useState(false)
  const [phaseToDelete, setPhaseToDelete] = React.useState<ProgramPhase | null>(
    null
  )

  const deleteConfirm = useConfirmDialog({
    title: phaseToDelete ? `Remove "${phaseToDelete.name}"?` : 'Remove phase?',
    description: 'Workouts in this day range are kept.',
    confirmLabel: 'Remove phase',
    destructive: true,
    onConfirm: async () => {
      if (!phaseToDelete) return

      setPending(true)
      const result = await deleteProgramPhase(programId, phaseToDelete.id)
      setPending(false)

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('Phase removed')
      setPhaseToDelete(null)
      await refreshPhases()
    },
  })

  const activePhase = getPhaseForDayOffset(phases, selectedDayOffset)

  const form = useForm<ProgramPhaseFormValues>({
    resolver: zodResolver(programPhaseFormSchema),
    defaultValues: buildDefaultPhaseValues(phases),
  })

  async function refreshPhases() {
    const result = await getProgramPhases(programId)
    if (result.success) {
      onPhasesChange(result.phases)
      return
    }
    toast.error(result.error)
  }

  function openCreateDialog() {
    setEditingPhase(null)
    form.reset(buildDefaultPhaseValues(phases))
    setDialogOpen(true)
  }

  function openEditDialog(phase: ProgramPhase) {
    setEditingPhase(phase)
    form.reset(phaseToFormValues(phase))
    setDialogOpen(true)
  }

  async function handleSubmit(values: ProgramPhaseFormValues) {
    setPending(true)
    const result = editingPhase
      ? await updateProgramPhase(programId, editingPhase.id, values)
      : await createProgramPhase(programId, values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(editingPhase ? 'Phase updated' : 'Phase added')
    setDialogOpen(false)
    setEditingPhase(null)
    await refreshPhases()

    if (!editingPhase && 'phaseId' in result) {
      const startOffset = values.startDay - 1
      onJumpToWeek(getWeekIndexForDayOffset(startOffset))
    }
  }

  function requestDelete(phase: ProgramPhase) {
    setPhaseToDelete(phase)
    deleteConfirm.open()
  }

  function handlePhaseClick(phase: ProgramPhase) {
    onJumpToWeek(getWeekIndexForDayOffset(phase.start_day_offset))
  }

  if (schemaError?.includes('Could not find the table')) {
    return (
      <SchemaSetupNotice
        tables={['program_phases']}
        sqlFile="apply-program-phases.sql"
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="text-brand size-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Training phases</p>
            <p className="text-muted-foreground text-xs">
              Group weeks into blocks like hypertrophy, strength, or peaking.
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={openCreateDialog}>
          <Plus className="size-4" />
          Add phase
        </Button>
      </div>

      {phases.length === 0 ? (
        <div className="bg-muted/20 rounded-lg border border-dashed px-4 py-6 text-center">
          <p className="text-muted-foreground text-sm">
            No phases yet. Add blocks to structure longer programs.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={openCreateDialog}
          >
            <Plus className="size-4" />
            Add first phase
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {phases.map((phase) => {
            const isActive = activePhase?.id === phase.id
            return (
              <div
                key={phase.id}
                className={cn(
                  'bg-background min-w-[180px] shrink-0 rounded-lg border px-3 py-2.5 transition-colors',
                  isActive && 'border-brand bg-brand/5 ring-brand/30 ring-1'
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => handlePhaseClick(phase)}
                >
                  <p className="truncate text-sm font-semibold">{phase.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {formatPhaseDayRange(phase)} · {formatPhaseDuration(phase)}
                  </p>
                </button>
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={pending}
                    onClick={() => openEditDialog(phase)}
                    aria-label={`Edit ${phase.name}`}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive size-7"
                    disabled={pending}
                    onClick={() => requestDelete(phase)}
                    aria-label={`Delete ${phase.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPhase ? 'Edit phase' : 'Add training phase'}
            </DialogTitle>
            <DialogDescription>
              Phases label day ranges within the program. They do not change
              scheduled workouts.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phase name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Hypertrophy block, Peaking, Taper week…"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="startDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          {...field}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          {...field}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Focus, intensity targets, or coaching notes for this block."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {editingPhase ? 'Save changes' : 'Add phase'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {deleteConfirm.dialog}
    </div>
  )
}
