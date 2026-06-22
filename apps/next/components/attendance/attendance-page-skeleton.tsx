import { Skeleton } from '@/components/ui/skeleton'

export function AttendancePageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="size-9 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-28 rounded-lg" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="space-y-2 border-b p-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="size-9 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
