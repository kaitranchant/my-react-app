import { listClientFormReviews } from '@/app/portal/form-review-actions'
import { FormReviewUploadCard } from '@/components/form-review/form-review-upload-card'
import { PortalFormReviewList } from '@/components/form-review/portal-form-review-list'
import { PortalFormReviewViewTracker } from '@/components/form-review/portal-form-review-view-tracker'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
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
        <h1 className="page-title">Form Review</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Upload lift photos or videos for your coach to review technique and leave
          feedback.
        </p>
      </section>

      {!clientRecord ? (
        <PortalUnlinkedState feature="submit form reviews" />
      ) : (
        <>
          <PortalFormReviewViewTracker />
          <FormReviewUploadCard exercises={exercises} />
          <PortalFormReviewList reviews={reviews} />
        </>
      )}
    </div>
  )
}
