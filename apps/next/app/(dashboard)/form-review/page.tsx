import { fetchCoachFormReviews } from '@/app/(dashboard)/form-review/actions'
import { FormReviewTabsSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { FormReviewTabs } from '@/components/form-review/form-review-tabs'
import { PageHeader } from '@/components/dashboard/page-header'
import { isFormReviewPending } from '@/lib/form-reviews'
import { Suspense } from 'react'

export const metadata = {
  title: 'Form Review — Coaching App',
}

export default async function FormReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const defaultTab = tab === 'all' ? 'all' : 'pending'

  const reviews = await fetchCoachFormReviews(100)
  const pendingReviews = reviews.filter((review) => isFormReviewPending(review))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Form Review"
        description="Review lift photos and videos submitted by clients and leave technique feedback."
      />

      <Suspense fallback={<FormReviewTabsSkeleton />}>
        <FormReviewTabs
          reviews={reviews}
          pendingReviews={pendingReviews}
          defaultTab={defaultTab}
        />
      </Suspense>
    </div>
  )
}
