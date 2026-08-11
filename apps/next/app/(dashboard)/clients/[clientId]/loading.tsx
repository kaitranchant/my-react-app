import { ClientOverviewTabSkeleton } from '@/components/clients/client-detail-tab-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

/** Lighter route fallback — shell stays mounted; avoid a second full-page chrome skeleton. */
export default function ClientDetailLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Skeleton className="h-4 w-28" />
      <section className="rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Skeleton className="size-16 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </section>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-lg" />
        ))}
      </div>
      <ClientOverviewTabSkeleton />
    </div>
  )
}
