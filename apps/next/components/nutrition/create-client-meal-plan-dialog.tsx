'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { createClientMealPlan } from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
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
  clientMealPlanFormSchema,
  type ClientMealPlanFormValues,
} from '@/lib/validations/nutrition'

type CreateClientMealPlanDialogProps = {
  clientId: string
  clientName: string
  trigger?: React.ReactNode
}

export function CreateClientMealPlanDialog({
  clientId,
  clientName,
  trigger,
}: CreateClientMealPlanDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const form = useForm<ClientMealPlanFormValues>({
    resolver: zodResolver(clientMealPlanFormSchema),
    defaultValues: {
      name: `${clientName} — Meal plan`,
      description: '',
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: `${clientName} — Meal plan`,
      description: '',
    })
  }, [open, clientName, form])

  async function onSubmit(values: ClientMealPlanFormValues) {
    setPending(true)
    const result = await createClientMealPlan(clientId, values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Client meal plan created.')
    setOpen(false)
    router.push(
      `/library/meal-plans/${result.mealPlanId}?clientId=${clientId}`
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            Create client plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create meal plan for {clientName}</DialogTitle>
          <DialogDescription>
            Build a plan tailored to this client. It won&apos;t appear in your
            reusable library templates.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      rows={2}
                      placeholder="Notes about this client's plan"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? 'Creating…' : 'Create & edit meals'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
