import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function AddClientButtonSkeleton() {
  return <Skeleton className="h-10 w-32 rounded-lg" />
}

export function ScopeTabsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full max-w-lg rounded-lg" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

export function FilterPillsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-24 rounded-full" />
      ))}
    </div>
  )
}

export function LeaderboardFiltersSkeleton() {
  return (
    <div className="space-y-4">
      <ScopeTabsSkeleton />
      <FilterPillsSkeleton count={5} />
      <FilterPillsSkeleton count={4} />
      <FilterPillsSkeleton count={3} />
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
    </div>
  )
}

export function FormReviewTabsSkeleton() {
  return (
    <div className="space-y-4">
      <FilterPillsSkeleton count={2} />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function ClientsPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <ScopeTabsSkeleton />
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <div className="overflow-hidden rounded-xl border">
        <div className="border-b bg-muted/30 px-5 py-4">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FormReviewPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <FormReviewTabsSkeleton />
    </div>
  )
}

export function BreadcrumbSkeleton() {
  return <Skeleton className="h-4 w-48" />
}

export function LibraryPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <FilterPillsSkeleton count={4} />
      <Skeleton className="h-28 rounded-xl" />
      <div className="overflow-hidden rounded-xl border">
        <div className="border-b bg-muted/30 px-5 py-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PageHeaderSkeleton({
  titleWidth = 'w-36',
  description = true,
  action = false,
}: {
  titleWidth?: string
  description?: boolean
  action?: boolean
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className={cn('h-8', titleWidth)} />
        {description ? <Skeleton className="h-4 w-full max-w-lg" /> : null}
      </div>
      {action ? <Skeleton className="h-10 w-36 rounded-lg" /> : null}
    </div>
  )
}

export function SchedulingPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeaderSkeleton titleWidth="w-32" action />
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeaderSkeleton titleWidth="w-28" />
      <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <Skeleton className="hidden h-56 rounded-xl lg:block" />
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function GymPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeaderSkeleton titleWidth="w-20" action />
      <ScopeTabsSkeleton />
      <Skeleton className="h-10 w-48 rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function TeamsPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeaderSkeleton titleWidth="w-24" action />
      <ScopeTabsSkeleton />
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function ProgressiveOverloadSkeleton() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeaderSkeleton titleWidth="w-44" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function ProgressPhotosSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeaderSkeleton titleWidth="w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function MyWorkoutsPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeaderSkeleton titleWidth="w-36" />
      <FilterPillsSkeleton count={2} />
      <Skeleton className="h-[22rem] rounded-xl sm:h-[26rem]" />
    </div>
  )
}

export function CoachLeaderboardsPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeaderSkeleton titleWidth="w-36" />
      <LeaderboardFiltersSkeleton />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function ProgramDetailPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <BreadcrumbSkeleton />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <FilterPillsSkeleton count={4} />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

export function GymJoinContentSkeleton() {
  return <Skeleton className="h-64 rounded-xl" />
}

export function CoachInboxPanelSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="grid min-h-[min(36rem,70vh)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b lg:border-b-0 lg:border-r">
          <div className="border-b px-4 py-4">
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex flex-col">
          <div className="space-y-2 border-b px-5 py-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 py-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className={`h-12 rounded-2xl ${index % 2 === 0 ? 'ml-auto w-2/5' : 'w-3/5'}`}
              />
            ))}
          </div>
          <div className="border-t px-5 py-4">
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
