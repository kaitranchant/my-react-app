import { listClientFormReviews } from '@/app/portal/form-review-actions'
import { FormReviewUploadCard } from '@/components/form-review/form-review-upload-card'
import { PortalFormReviewList } from '@/components/form-review/portal-form-review-list'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Form Review — Coaching App',
}

export default async function PortalFormReviewPage() {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let exercises: { id: string; name: string }[] = []
  let reviews: Awaited<ReturnType<typeof listClientFormReviews>> = []

  if (clientRecord) {
    const [{ data: exerciseRows }, reviewRows] = await Promise.all([
      supabase
        .from('exercises')
        .select('id, name')
        .eq('coach_id', clientRecord.coach_id)
        .eq('status', 'active')
        .order('name', { ascending: true }),
      listClientFormReviews(),
    ])

    exercises = exerciseRows ?? []
    reviews = reviewRows
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Form Review</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Upload lift videos for your coach to review technique and leave
          feedback.
        </p>
      </section>

      {!clientRecord ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link so you can submit videos.
          </CardContent>
        </Card>
      ) : (
        <>
          <FormReviewUploadCard exercises={exercises} />
          <PortalFormReviewList reviews={reviews} />
        </>
      )}
    </div>
  )
}
