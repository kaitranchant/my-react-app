'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FormReviewFeed } from '@/components/form-review/form-review-review-card'
import { FilterPills } from '@/components/ui/filter-pills'
import type { ClientFormReviewWithClient } from 'app/types/database'

type FormReviewTabsProps = {
  reviews: ClientFormReviewWithClient[]
  pendingReviews: ClientFormReviewWithClient[]
  defaultTab: 'pending' | 'all'
}

export function FormReviewTabs({
  reviews,
  pendingReviews,
  defaultTab,
}: FormReviewTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') === 'all' ? 'all' : defaultTab

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'pending') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="space-y-4">
      <FilterPills
        value={tab}
        onChange={handleTabChange}
        options={[
          {
            value: 'pending',
            label:
              pendingReviews.length > 0
                ? `Pending (${pendingReviews.length})`
                : 'Pending',
          },
          { value: 'all', label: 'All' },
        ]}
      />

      {tab === 'pending' ? (
        <FormReviewFeed
          reviews={pendingReviews}
          emptyMessage="No videos waiting for review."
        />
      ) : (
        <FormReviewFeed
          reviews={reviews}
          emptyMessage="No form review submissions yet."
        />
      )}
    </div>
  )
}
