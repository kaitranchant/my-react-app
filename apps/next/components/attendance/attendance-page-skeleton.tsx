import { Skeleton } from '@/components/ui/skeleton'

import { AttendanceContentSkeleton } from '@/components/attendance/attendance-content-skeleton'

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
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="size-9 rounded-md" />
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

      <AttendanceContentSkeleton />
    </div>
  )
}
