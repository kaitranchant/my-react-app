'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

import { updateClientNutritionProfile } from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { nutritionProfileToFormValues } from '@/lib/nutrition'
import type { ClientNutritionProfile } from 'app/types/database'

type CoachNutritionNotesCardProps = {
  clientId: string
  profile: ClientNutritionProfile | null
}

export function CoachNutritionNotesCard({
  clientId,
  profile,
}: CoachNutritionNotesCardProps) {
  const router = useRouter()
  const [notes, setNotes] = React.useState(profile?.notes ?? '')
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setNotes(profile?.notes ?? '')
  }, [profile?.notes])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = await updateClientNutritionProfile(clientId, {
      ...nutritionProfileToFormValues(profile),
      notes: notes.trim() || null,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Coach notes saved.')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4" />
          Coach notes
        </CardTitle>
        <CardDescription>
          Guidance shown to the client on their nutrition page. Separate from
          macro targets and dietary info.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="coach-nutrition-notes">Coach guidance</Label>
            <Textarea
              id="coach-nutrition-notes"
              rows={4}
            placeholder="Guidance shown to the client (optional)"
            value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save notes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
