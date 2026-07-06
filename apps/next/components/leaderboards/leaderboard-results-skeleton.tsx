import { Skeleton } from '@/components/ui/skeleton'

export function LeaderboardResultsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <div className="overflow-hidden rounded-xl border">
        <div className="border-b bg-muted/30 px-5 py-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
