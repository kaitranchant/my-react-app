'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  createMessageTemplateRecord,
  updateMessageTemplateRecord,
} from '@/app/(dashboard)/library/message-templates/actions'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  messageTemplateFormDefaults,
  messageTemplateFormSchema,
  type MessageTemplateFormValues,
} from '@/lib/validations/message-template'
import type { CoachMessageTemplate } from 'app/types/database'

type MessageTemplateFormDialogProps = {
  template?: CoachMessageTemplate
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MessageTemplateFormDialog({
  template,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: MessageTemplateFormDialogProps) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const isEdit = Boolean(template)

  const form = useForm<MessageTemplateFormValues>({
    resolver: zodResolver(messageTemplateFormSchema),
    defaultValues: template
      ? {
          name: template.name,
          body: template.body,
        }
      : messageTemplateFormDefaults,
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(
      template
        ? {
            name: template.name,
            body: template.body,
          }
        : messageTemplateFormDefaults
    )
  }, [open, template, form])

  async function onSubmit(values: MessageTemplateFormValues) {
    const result = isEdit
      ? await updateMessageTemplateRecord(template!.id, values)
      : await createMessageTemplateRecord(values)

    if (result.success) {
      toast.success(isEdit ? 'Template updated' : 'Template created')
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit message template' : 'New message template'}
          </DialogTitle>
          <DialogDescription>
            Save reusable text for client messages. Use{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              {'{{clientName}}'}
            </code>{' '}
            to insert the client&apos;s name when you pick a template.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Weekly check-in reminder" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Hey {{clientName}}, just checking in…"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Up to 4,000 characters — same limit as a regular message.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEdit ? 'Save changes' : 'Create template'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function AddMessageTemplateButton() {
  return (
    <MessageTemplateFormDialog
      trigger={
        <Button>
          <Plus className="size-4" />
          New template
        </Button>
      }
    />
  )
}
