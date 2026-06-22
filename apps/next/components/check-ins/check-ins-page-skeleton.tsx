import { Skeleton } from '@/components/ui/skeleton'

export function CheckInsPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
