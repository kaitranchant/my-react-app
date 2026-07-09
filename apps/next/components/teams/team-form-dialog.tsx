'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  createTeamRecord,
  updateTeamRecord,
} from '@/app/(dashboard)/teams/actions'
import { ClientGymField } from '@/components/clients/client-gym-field'
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
import { Textarea } from '@/components/ui/textarea'
import {
  teamFormDefaults,
  teamFormSchema,
  type TeamFormValues,
} from '@/lib/validations/team'
import type { Team } from 'app/types/database'

type GymOption = {
  id: string
  name: string
}

function teamToFormValues(team: Team): TeamFormValues {
  return {
    name: team.name,
    description: team.description ?? '',
    nextCompetitionName: team.next_competition_name ?? '',
    nextCompetitionDate: team.next_competition_date ?? '',
    gymId: team.gym_id ?? 'none',
  }
}

type TeamFormDialogProps = {
  team?: Team
  gyms?: GymOption[]
  requireGymMembership?: boolean
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TeamFormDialog({
  team,
  gyms = [],
  requireGymMembership = false,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: TeamFormDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const createDefaults = React.useMemo<TeamFormValues>(
    () => ({
      ...teamFormDefaults,
      gymId:
        requireGymMembership && gyms.length > 0
          ? gyms[0].id
          : teamFormDefaults.gymId,
    }),
    [gyms, requireGymMembership]
  )

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: team ? teamToFormValues(team) : createDefaults,
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(team ? teamToFormValues(team) : createDefaults)
  }, [createDefaults, form, open, team])

  async function onSubmit(values: TeamFormValues) {
    try {
      const result = team
        ? await updateTeamRecord(team.id, values)
        : await createTeamRecord(values)

      if (result.success) {
        toast.success(team ? 'Team updated' : 'Team created')
        setOpen(false)
        if (!team && 'teamId' in result) {
          router.push(`/teams/${result.teamId}`)
        } else {
          router.refresh()
        }
        return
      }

      toast.error(result.error)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save team.'
      )
    }
  }

  const defaultTrigger = (
    <Button>
      <Plus className="size-4" />
      Create team
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && controlledOpen === undefined && (
        <DialogTrigger asChild>{defaultTrigger}</DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit team' : 'Create team'}</DialogTitle>
          <DialogDescription>
            {team
              ? 'Update this team’s details and gym membership.'
              : 'Group clients who share the same workout program, like a powerlifting team.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <input type="hidden" {...form.register('gymId')} />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Powerlifting team" {...field} />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Competition prep group, meets in March…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ClientGymField
              control={form.control}
              name="gymId"
              gyms={gyms}
              requireGymMembership={requireGymMembership}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nextCompetitionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next competition (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="State Championships" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextCompetitionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competition date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving…'
                  : team
                    ? 'Save changes'
                    : 'Create team'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
