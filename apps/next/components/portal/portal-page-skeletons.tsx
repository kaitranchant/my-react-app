import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

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

export function PortalPageHeaderSkeleton({
  titleWidth = 'w-36',
  description = true,
}: {
  titleWidth?: string
  description?: boolean
}) {
  return (
    <section className="space-y-2">
      <Skeleton className={cn('h-8', titleWidth)} />
      {description ? <Skeleton className="h-4 w-full max-w-md" /> : null}
    </section>
  )
}

export function PortalCheckInSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-28" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

export function PortalMessagesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-32" />
      <Skeleton className="h-[min(36rem,70vh)] rounded-xl" />
    </div>
  )
}

export function PortalGoalsSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-24" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <PortalSectionSkeleton rows={4} />
    </div>
  )
}

export function PortalFormReviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-36" />
      <Skeleton className="h-44 rounded-xl" />
      <PortalSectionSkeleton rows={4} />
    </div>
  )
}

export function PortalTeamSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-24" />
      <Skeleton className="h-10 w-48 rounded-lg" />
      <PortalSectionSkeleton rows={3} />
      <PortalSectionSkeleton rows={2} />
    </div>
  )
}

export function PortalAccountSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-28" />
      <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <Skeleton className="hidden h-48 rounded-xl lg:block" />
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function PortalInbodySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-40" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function PortalWearablesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-32" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  )
}

export function PortalSessionsSkeleton() {
  return (
    <div className="space-y-6">
      <PortalPageHeaderSkeleton titleWidth="w-28" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

export function PortalNutritionSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-32" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <PortalSectionSkeleton rows={3} />
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}

export function PortalLeaderboardsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PortalPageHeaderSkeleton titleWidth="w-36" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
      <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
