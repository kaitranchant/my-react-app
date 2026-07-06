import { Skeleton } from '@/components/ui/skeleton'

export function AttendanceDateSkeleton() {
  return (
    <div className="rounded-xl border opacity-80">
      <div className="divide-y">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-6 py-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
