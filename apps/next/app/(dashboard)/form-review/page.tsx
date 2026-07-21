import { fetchCoachFormReviews } from '@/app/(dashboard)/form-review/actions'
import { FormReviewTabsSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { FormReviewTabs } from '@/components/form-review/form-review-tabs'
import { PageHeader } from '@/components/dashboard/page-header'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import { isFormReviewPending } from '@/lib/form-reviews'
import { getSubscriptionGate } from '@/lib/subscription-server'
import { Suspense } from 'react'

export const metadata = {
  title: 'Form Review — Coaching App',
}

export default async function FormReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const gate = await getSubscriptionGate('form_review')
  if (!gate.allowed) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <PageHeader
          title="Form Review"
          description="Review media from your clients and shared gym clients. Each client can only see their own submissions."
        />
        <UpgradePrompt gate={gate} />
      </div>
    )
  }

  const { tab } = await searchParams
  const defaultTab = tab === 'all' ? 'all' : 'pending'

  const reviews = await fetchCoachFormReviews(100)
  const pendingReviews = reviews.filter((review) => isFormReviewPending(review))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Form Review"
        description="Review media from your clients and shared gym clients. Each client can only see their own submissions."
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
