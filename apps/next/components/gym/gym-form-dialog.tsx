'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  createGymRecord,
  updateGymRecord,
} from '@/app/(dashboard)/gym/actions'
import { DeleteGymDialog } from '@/components/gym/delete-gym-dialog'
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
  gymFormDefaults,
  gymFormSchema,
  type GymFormValues,
} from '@/lib/validations/gym'
import type { Gym } from 'app/types/database'

type GymFormDialogProps = {
  gym?: Gym
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function GymFormDialog({
  gym,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: GymFormDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const isEdit = Boolean(gym)

  const form = useForm<GymFormValues>({
    resolver: zodResolver(gymFormSchema),
    defaultValues: gym ? { name: gym.name } : gymFormDefaults,
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(gym ? { name: gym.name } : gymFormDefaults)
  }, [open, gym, form])

  async function onSubmit(values: GymFormValues) {
    if (isEdit) {
      const result = await updateGymRecord(gym!.id, values)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Gym updated.')
      setOpen(false)
      router.refresh()
      return
    }

    const result = await createGymRecord(values)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Gym created.')
    setOpen(false)
    router.push(`/gym?gym=${result.gymId}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit gym' : 'Create gym'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update your gym name.'
              : 'Create a gym to invite other coaches and add clients as members.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gym name</FormLabel>
                  <FormControl>
                    <Input placeholder="Iron Temple" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit ? (
              <DialogFooter className="gap-2 sm:justify-between">
                <DeleteGymDialog
                  gymId={gym!.id}
                  gymName={gym!.name}
                  onDeleted={() => setOpen(false)}
                  trigger={
                    <Button type="button" variant="destructive">
                      Delete gym
                    </Button>
                  }
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
              </DialogFooter>
            ) : (
              <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating…' : 'Create gym'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function CreateGymButton() {
  return (
    <GymFormDialog
      trigger={
        <Button>
          <Plus className="size-4" />
          Create gym
        </Button>
      }
    />
  )
}
