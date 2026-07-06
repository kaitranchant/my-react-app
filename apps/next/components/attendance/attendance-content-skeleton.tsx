import { Skeleton } from '@/components/ui/skeleton'

export function AttendanceContentSkeleton() {
  return (
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
  )
}
