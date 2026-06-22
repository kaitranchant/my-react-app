import { Skeleton } from '@/components/ui/skeleton'

export function ClientDetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <Skeleton className="h-4 w-28" />

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="size-16 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-56" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
