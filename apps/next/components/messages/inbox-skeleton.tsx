import { CoachInboxPanelSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export function InboxSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <CoachInboxPanelSkeleton />
    </div>
  )
}
