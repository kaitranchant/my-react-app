import { Skeleton } from '@/components/ui/skeleton'

export function InboxSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

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
    </div>
  )
}
