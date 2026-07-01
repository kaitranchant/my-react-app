'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ClipboardList, Send } from 'lucide-react'
import { toast } from 'sonner'

import { requestNutritionSetupForm } from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { NutritionSetupIntakeSummary } from '@/components/nutrition/nutrition-setup-intake-summary'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatSetupFormDate,
  hasNutritionSetupIntake,
  isNutritionSetupFormDue,
} from '@/lib/nutrition-setup-form'
import type { ClientNutritionProfile } from 'app/types/database'

type NutritionSetupFormRequestCardProps = {
  clientId: string
  clientName: string
  profile: ClientNutritionProfile | null
  hasPortalAccess: boolean
}

export function NutritionSetupFormRequestCard({
  clientId,
  clientName,
  profile,
  hasPortalAccess,
}: NutritionSetupFormRequestCardProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const formDue = isNutritionSetupFormDue(profile)
  const hasIntake = hasNutritionSetupIntake(profile)
  const requestedLabel = formatSetupFormDate(
    profile?.setup_form_requested_at ?? null
  )
  const completedLabel = formatSetupFormDate(
    profile?.setup_form_completed_at ?? null
  )

  async function handleSend() {
    setPending(true)
    const result = await requestNutritionSetupForm(clientId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(`Setup form sent to ${clientName}.`)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4" />
          Nutrition setup form
        </CardTitle>
        <CardDescription>
          Send {clientName} a short intake form to collect favorite foods,
          current macros, allergies, and other details before you build their
          meal plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {formDue ? (
          <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
            Waiting for {clientName} to complete the setup form
            {requestedLabel ? ` (sent ${requestedLabel})` : ''}.
          </div>
        ) : hasIntake ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>
              Setup form completed
              {completedLabel ? ` on ${completedLabel}` : ''}.
            </span>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No setup form has been sent yet.
          </p>
        )}

        {hasIntake ? <NutritionSetupIntakeSummary profile={profile} /> : null}

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSend}
            disabled={pending || !hasPortalAccess}
          >
            <Send className="size-4" />
            {formDue ? 'Resend setup form' : 'Send setup form'}
          </Button>
        </div>

        {!hasPortalAccess ? (
          <p className="text-muted-foreground text-xs">
            Invite this client to the portal before sending the setup form.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
