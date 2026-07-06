import { Badge } from '@/components/ui/badge'

export function ClientOnboardingDocsBadge({ pendingCount }: { pendingCount: number }) {
  if (pendingCount <= 0) return null

  return (
    <Badge variant="warning-soft">
      Docs pending{pendingCount > 1 ? ` (${pendingCount})` : ''}
    </Badge>
  )
}
