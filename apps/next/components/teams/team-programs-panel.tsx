'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClipboardList, ExternalLink, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  assignProgramToTeam,
  unassignProgramFromTeam,
} from '@/app/(dashboard)/teams/actions'
import { ProgramStatusBadge } from '@/components/programs/program-status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toDateKey } from '@/lib/calendar'
import {
  assignProgramToTeamSchema,
  type AssignProgramToTeamValues,
} from '@/lib/validations/team'
import type {
  Program,
  Team,
  TeamProgramHistoryEntry,
  TeamProgramProgress,
} from 'app/types/database'

type TeamProgramsPanelProps = {
  teamId: string
  team: Pick<Team, 'active_program_id' | 'program_start_date'>
  activeProgram: Pick<Program, 'id' | 'name' | 'description' | 'status'> | null
  availablePrograms: Pick<Program, 'id' | 'name' | 'status'>[]
  memberCount: number
  programProgress: TeamProgramProgress | null
  programHistory: TeamProgramHistoryEntry[]
}

function formatStartDate(value: string | null) {
  if (!value) return null
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TeamProgramsPanel({
  teamId,
  team,
  activeProgram,
  availablePrograms,
  memberCount,
  programProgress,
  programHistory,
}: TeamProgramsPanelProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [unassignOpen, setUnassignOpen] = React.useState(false)
  const [unassignMembers, setUnassignMembers] = React.useState(true)
  const [showAssignForm, setShowAssignForm] = React.useState(!activeProgram)

  const assignablePrograms = availablePrograms.filter(
    (program) => program.status !== 'archived'
  )

  const form = useForm<AssignProgramToTeamValues>({
    resolver: zodResolver(assignProgramToTeamSchema),
    defaultValues: {
      programId: '',
      startDate: toDateKey(new Date()),
    },
  })

  async function onAssign(values: AssignProgramToTeamValues) {
    setPending(true)
    const result = await assignProgramToTeam(teamId, values)
    setPending(false)

    if (result.success) {
      const memberMessage =
        memberCount === 0
          ? ''
          : ` Assigned to ${result.assignedCount} of ${memberCount} member${
              memberCount === 1 ? '' : 's'
            }.`
      if (result.failedCount > 0) {
        toast.warning(
          `Program assigned with ${result.failedCount} failure${
            result.failedCount === 1 ? '' : 's'
          }.${memberMessage}`
        )
      } else {
        toast.success(`Program assigned to team.${memberMessage}`)
      }
      form.reset({ programId: '', startDate: toDateKey(new Date()) })
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  async function onUnassign() {
    setPending(true)
    const result = await unassignProgramFromTeam(teamId, { unassignMembers })
    setPending(false)

    if (result.success) {
      const message =
        unassignMembers && result.unassignedCount > 0
          ? ` Program removed from ${result.unassignedCount} member${
              result.unassignedCount === 1 ? '' : 's'
            }.`
          : ''
      toast.success(`Team program removed.${message}`)
      setUnassignOpen(false)
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  return (
    <div className="space-y-4">
      {activeProgram ? (
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b bg-muted/30 px-5 py-4">
            <div className="space-y-1">
              <CardTitle>
                {activeProgram.name}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <ProgramStatusBadge status={activeProgram.status} />
                {team.program_start_date && (
                  <span className="text-muted-foreground text-xs">
                    Started {formatStartDate(team.program_start_date)}
                  </span>
                )}
                {programProgress && (
                  <span className="text-muted-foreground text-xs">
                    Week {programProgress.currentWeek} of {programProgress.totalWeeks}
                    {programProgress.currentPhase
                      ? ` · ${programProgress.currentPhase.name}`
                      : ''}
                    · {programProgress.workoutsRemainingThisWeek} workout
                    {programProgress.workoutsRemainingThisWeek === 1 ? '' : 's'}{' '}
                    remaining this week
                  </span>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              disabled={pending}
              onClick={() => setUnassignOpen(true)}
            >
              <X className="size-4" />
              <span className="sr-only">Remove assignment</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 px-5 py-4">
            {activeProgram.description ? (
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {activeProgram.description}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No description on this program yet.
              </p>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/library/programs/${activeProgram.id}`}>
                <ExternalLink className="size-4" />
                View program calendar
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <div className="empty-state-icon">
            <ClipboardList className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No program assigned</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              Assign a program to schedule the same workouts for every team
              member.
            </p>
          </div>
        </div>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-muted-foreground">
            {activeProgram ? 'Change program' : 'Assign program'}
          </CardTitle>
          {activeProgram && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAssignForm((open) => !open)}
            >
              {showAssignForm ? 'Hide' : 'Change program'}
            </Button>
          )}
        </CardHeader>
        {(showAssignForm || !activeProgram) && (
        <CardContent className="px-5 py-5">
          {assignablePrograms.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Create a program in the Library first, then assign it here.
            </p>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onAssign)}
                className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
              >
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>Program</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a program" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assignablePrograms.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                              {program.status === 'draft' ? ' (draft)' : ''}
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
                <Button
                  type="submit"
                  disabled={pending || form.formState.isSubmitting}
                >
                  {pending ? 'Assigning…' : activeProgram ? 'Reassign' : 'Assign'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        )}
      </Card>

      {programHistory.length > 0 && (
        <Card className="gap-0 py-0">
          <CardHeader className="border-b bg-muted/30 px-5 py-4">
            <CardTitle className="text-muted-foreground">Program history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {programHistory.map((entry) => (
                <li
                  key={`${entry.programId}-${entry.startDate ?? 'na'}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{entry.programName}</p>
                    <p className="text-muted-foreground text-xs">
                      {entry.startDate
                        ? `Started ${formatStartDate(entry.startDate)}`
                        : 'No start date'}
                      {entry.endedAt
                        ? ` · Ended ${new Date(entry.endedAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs capitalize">
                    {entry.status}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={unassignOpen} onOpenChange={setUnassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove team program?</DialogTitle>
            <DialogDescription>
              This clears the team&apos;s active program. Choose whether to
              unassign members too.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Member programs</Label>
            <Select
              value={unassignMembers ? 'unassign' : 'keep'}
              onValueChange={(value) => setUnassignMembers(value === 'unassign')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassign">
                  Unassign program from all members with a team assignment
                </SelectItem>
                <SelectItem value="keep">
                  Keep member programs and calendars unchanged
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnassignOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onUnassign}
              disabled={pending}
            >
              {pending ? 'Removing…' : 'Remove program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
