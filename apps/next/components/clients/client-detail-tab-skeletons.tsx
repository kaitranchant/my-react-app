import { Skeleton } from '@/components/ui/skeleton'

export type ClientDetailMainTab =
  | 'overview'
  | 'training'
  | 'nutrition'
  | 'progress'
  | 'messages'

export function ClientOverviewTabSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}

export function ClientTrainingTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <Skeleton className="h-[28rem] rounded-xl" />
    </div>
  )
}

export function ClientProgressTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function ClientNutritionTabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function ClientMessagesTabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[min(32rem,60vh)] rounded-xl" />
    </div>
  )
}

export function clientDetailTabSkeleton(tab: ClientDetailMainTab) {
  switch (tab) {
    case 'training':
      return <ClientTrainingTabSkeleton />
    case 'nutrition':
      return <ClientNutritionTabSkeleton />
    case 'progress':
      return <ClientProgressTabSkeleton />
    case 'messages':
      return <ClientMessagesTabSkeleton />
    default:
      return <ClientOverviewTabSkeleton />
  }
}
