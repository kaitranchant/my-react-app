import { Skeleton } from '@/components/ui/skeleton'

export function LoadDashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 rounded-xl" />

      <div className="rounded-xl border">
        <div className="space-y-4 border-b p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
