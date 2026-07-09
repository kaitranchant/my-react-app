import { Badge } from '@/components/ui/badge'

export function ClientGymBadge({
  gymName,
  primaryCoachName,
  isOwnClient,
}: {
  gymName?: string | null
  primaryCoachName?: string | null
  isOwnClient: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="text-xs">
        {gymName ? `${gymName} member` : 'Gym member'}
      </Badge>
      {!isOwnClient && primaryCoachName ? (
        <span className="text-muted-foreground text-xs">
          Primary coach: {primaryCoachName}
        </span>
      ) : null}
    </div>
  )
}

export function ClientSharedBanner({
  primaryCoachName,
}: {
  primaryCoachName: string
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm">
      <span className="text-muted-foreground">Primary coach: </span>
      <span className="font-medium">{primaryCoachName}</span>
    </div>
  )
}
