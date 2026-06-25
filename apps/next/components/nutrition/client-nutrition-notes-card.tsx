'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateClientNutritionNotes } from '@/app/portal/nutrition-actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type ClientNutritionNotesCardProps = {
  initialNotes: string | null
  readOnly?: boolean
}

export function ClientNutritionNotesCard({
  initialNotes,
  readOnly = false,
}: ClientNutritionNotesCardProps) {
  const router = useRouter()
  const [notes, setNotes] = React.useState(initialNotes ?? '')
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setNotes(initialNotes ?? '')
  }, [initialNotes])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = await updateClientNutritionNotes({
      clientNutritionNotes: notes || null,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Nutrition notes saved.')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nutrition notes</CardTitle>
        <CardDescription>
          {readOnly
            ? "Client's notes about cravings, struggles, or what they're actually eating."
            : "Share what you're eating, cravings, or meals you find difficult."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {readOnly ? (
          notes.trim() ? (
            <p className="text-sm leading-relaxed">{notes}</p>
          ) : (
            <p className="text-muted-foreground text-sm">No notes yet.</p>
          )
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-3">
            <Textarea
              rows={3}
              placeholder="e.g. Struggling with evening snacking, craving sweets after dinner…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? 'Saving…' : 'Save notes'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
