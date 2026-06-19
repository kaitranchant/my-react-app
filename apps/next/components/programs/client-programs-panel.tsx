'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { ClipboardList, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  assignProgramToClient,
  unassignProgramFromClient,
} from '@/app/(dashboard)/library/programs/actions'
import { ProgramStatusBadge } from '@/components/programs/program-status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { assignProgramSchema, type AssignProgramValues } from '@/lib/validations/program'
import type { ClientProgramAssignment, Program } from 'app/types/database'

type ClientProgramsPanelProps = {
  clientId: string
  activeAssignment: ClientProgramAssignment | null
  availablePrograms: Pick<Program, 'id' | 'name' | 'status'>[]
}

function formatStartDate(value: string | null) {
  if (!value) return null
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ClientProgramsPanel({
  clientId,
  activeAssignment,
  availablePrograms,
}: ClientProgramsPanelProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const assignablePrograms = availablePrograms.filter(
    (program) => program.status !== 'archived'
  )

  const form = useForm<AssignProgramValues>({
    resolver: zodResolver(assignProgramSchema),
    defaultValues: {
      programId: '',
      startDate: '',
    },
  })

  async function onAssign(values: AssignProgramValues) {
    setPending(true)
    const result = await assignProgramToClient(clientId, values)
    setPending(false)
    if (result.success) {
      if (result.scheduledCount > 0) {
        const skippedMessage =
          result.skippedCount > 0
            ? ` ${result.skippedCount} day${
                result.skippedCount === 1 ? '' : 's'
              } skipped (already had workouts).`
            : ''
        toast.success(
          `Program assigned — ${result.scheduledCount} workout${
            result.scheduledCount === 1 ? '' : 's'
          } added to calendar.${skippedMessage}`
        )
      } else {
        toast.success('Program assigned')
      }
      form.reset({ programId: '', startDate: '' })
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function onUnassign() {
    if (!window.confirm(
      'Remove this program assignment? Workouts added from the program will be removed from the calendar.'
    )) return
    setPending(true)
    const result = await unassignProgramFromClient(clientId)
    setPending(false)
    if (result.success) {
      const removedMessage =
        result.removedCount > 0
          ? ` ${result.removedCount} program workout${
              result.removedCount === 1 ? '' : 's'
            } removed from calendar.`
          : ''
      toast.success(`Program removed.${removedMessage}`)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-4">
      {activeAssignment ? (
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b bg-muted/30 px-5 py-4">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                {activeAssignment.program.name}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <ProgramStatusBadge status={activeAssignment.program.status} />
                {activeAssignment.team && (
                  <Link
                    href={`/teams/${activeAssignment.team.id}`}
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                  >
                    via {activeAssignment.team.name}
                  </Link>
                )}
                {activeAssignment.start_date && (
                  <span className="text-muted-foreground text-xs">
                    Started {formatStartDate(activeAssignment.start_date)}
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
              onClick={onUnassign}
            >
              <X className="size-4" />
              <span className="sr-only">Remove assignment</span>
            </Button>
          </CardHeader>
          <CardContent className="px-5 py-4">
            {activeAssignment.program.description ? (
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {activeAssignment.program.description}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No description on this program yet.
              </p>
            )}
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
              Assign a program to fill this client&apos;s calendar with its
              scheduled workouts.
            </p>
          </div>
        </div>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">
            {activeAssignment ? 'Change program' : 'Assign program'}
          </CardTitle>
        </CardHeader>
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
                <Button type="submit" disabled={pending || form.formState.isSubmitting}>
                  {pending ? 'Assigning…' : activeAssignment ? 'Reassign' : 'Assign'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
