import { Skeleton } from '@/components/ui/skeleton'
import { LoadDashboardSkeleton } from '@/components/load/load-dashboard-skeleton'

export default function LoadPageLoading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <LoadDashboardSkeleton />
    </div>
  )
}
