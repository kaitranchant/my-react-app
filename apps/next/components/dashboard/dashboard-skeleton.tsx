import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:gap-8">
      <div className="space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          <Skeleton className="h-11 w-32 shrink-0 rounded-xl" />
          <Skeleton className="h-11 w-36 shrink-0 rounded-xl" />
          <Skeleton className="h-11 w-40 shrink-0 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl sm:h-28" />
        ))}
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <Skeleton className="h-44 rounded-xl sm:h-80" />
        <Skeleton className="h-44 rounded-xl sm:h-80" />
      </div>

      <Skeleton className="h-64 rounded-xl sm:h-96" />
    </div>
  )
}
