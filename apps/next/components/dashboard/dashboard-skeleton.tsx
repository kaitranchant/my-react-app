import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <Skeleton className="h-44 rounded-2xl" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
