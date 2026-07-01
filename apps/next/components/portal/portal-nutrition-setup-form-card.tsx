'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { toast } from 'sonner'

import { submitNutritionSetupForm } from '@/app/portal/nutrition-actions'
import { NutritionSetupForm } from '@/components/nutrition/nutrition-setup-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ClientNutritionProfile } from 'app/types/database'

type PortalNutritionSetupFormCardProps = {
  profile: ClientNutritionProfile | null
}

export function PortalNutritionSetupFormCard({
  profile,
}: PortalNutritionSetupFormCardProps) {
  const router = useRouter()

  return (
    <Card className="border-brand/30 bg-brand/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4 text-brand" />
          Nutrition setup form
        </CardTitle>
        <CardDescription>
          Help your coach plan your meals by sharing your favorite foods, what
          you eat now, and any allergies or preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <NutritionSetupForm
          profile={profile}
          onSubmit={async (values) => {
            const result = await submitNutritionSetupForm(values)
            if (!result.success) {
              toast.error(result.error)
              return result
            }

            toast.success('Setup form submitted. Your coach has been notified.')
            router.refresh()
            return result
          }}
        />
      </CardContent>
    </Card>
  )
}
