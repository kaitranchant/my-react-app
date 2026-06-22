import { Skeleton } from '@/components/ui/skeleton'

export function TeamDetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Skeleton className="h-4 w-24" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-20" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
