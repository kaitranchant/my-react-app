'use client'

import * as React from 'react'

import { markClientFormReviewsAsViewed } from '@/app/portal/form-review-actions'

/** Marks coach form review replies as viewed when the client opens the page. */
export function PortalFormReviewViewTracker() {
  React.useEffect(() => {
    void markClientFormReviewsAsViewed()
  }, [])

  return null
}
