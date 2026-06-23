import { Skeleton } from '@/components/ui/skeleton'

export function PortalHomeSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-baseline justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-28" />
      </div>

      <Skeleton className="h-36 rounded-xl" />

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:hidden">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>

      <div className="hidden items-start gap-6 lg:grid lg:grid-cols-[1.35fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </aside>
      </div>
    </div>
  )
}

export function PortalProgressSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <section className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="hidden h-4 w-full max-w-md md:block" />
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl md:h-28" />
        ))}
      </div>

      <Skeleton className="h-40 rounded-xl md:h-48" />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

export function PortalWorkoutsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </section>

      <Skeleton className="h-[22rem] rounded-xl sm:h-[26rem]" />
    </div>
  )
}

export function PortalSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 rounded-xl" />
      ))}
    </div>
  )
}
