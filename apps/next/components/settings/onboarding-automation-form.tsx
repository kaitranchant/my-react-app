'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { updateOnboardingAutomation } from '@/app/(dashboard)/settings/actions'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  onboardingAutomationSchema,
  type OnboardingAutomationValues,
} from '@/lib/validations/onboarding-automation'
import type { CoachMessageTemplate, Program } from 'app/types/database'

const NONE_VALUE = '__none__'

type OnboardingAutomationFormProps = {
  defaultValues: OnboardingAutomationValues
  programs: Pick<Program, 'id' | 'name' | 'status'>[]
  messageTemplates: Pick<CoachMessageTemplate, 'id' | 'name'>[]
}

export function OnboardingAutomationForm({
  defaultValues,
  programs,
  messageTemplates,
}: OnboardingAutomationFormProps) {
  const form = useForm<OnboardingAutomationValues>({
    resolver: zodResolver(onboardingAutomationSchema),
    defaultValues,
  })

  const assignablePrograms = programs.filter(
    (program) => program.status !== 'archived'
  )

  async function onSubmit(values: OnboardingAutomationValues) {
    const result = await updateOnboardingAutomation(values)
    if (result.success) {
      toast.success('Onboarding automation saved')
      form.reset(values)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <SettingsRow
          label="Default program for new clients"
          description="Automatically assigned when a client accepts their invite."
        >
          <FormField
            control={form.control}
            name="defaultOnboardingProgramId"
            render={({ field }) => (
              <FormItem>
                <Select
                  value={field.value || NONE_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE_VALUE ? '' : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
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
        </SettingsRow>

        <SettingsRow
          label="Welcome message template"
          description="Sent automatically when a client accepts their invite. Manage templates in Library → Message templates."
        >
          <FormField
            control={form.control}
            name="onboardingWelcomeTemplateId"
            render={({ field }) => (
              <FormItem>
                <Select
                  value={field.value || NONE_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === NONE_VALUE ? '' : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>None</SelectItem>
                    {messageTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsRow>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting ? 'Saving…' : 'Save automation'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
