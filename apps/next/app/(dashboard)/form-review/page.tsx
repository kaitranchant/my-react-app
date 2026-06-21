import { fetchCoachFormReviews } from '@/app/(dashboard)/form-review/actions'
import { FormReviewFeed } from '@/components/form-review/form-review-review-card'
import { PageHeader } from '@/components/dashboard/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isFormReviewPending } from '@/lib/form-reviews'

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

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingReviews.length > 0 && ` (${pendingReviews.length})`}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <FormReviewFeed
            reviews={pendingReviews}
            emptyMessage="No videos waiting for review."
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <FormReviewFeed
            reviews={reviews}
            emptyMessage="No form review submissions yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
