import { UserX } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type PortalUnlinkedStateProps = {
  /** Completes: "...before you can {feature}." */
  feature?: string
  /** Override the default description entirely. */
  description?: string
  className?: string
}

export function PortalUnlinkedState({
  feature = 'use the portal',
  description,
  className,
}: PortalUnlinkedStateProps) {
  const resolvedDescription =
    description ??
    `Your account is not linked to a client profile yet. Ask your coach to send you an invite link before you can ${feature}.`

  return (
    <Card className={cn(className)}>
      <CardContent>
        <EmptyState
          icon={UserX}
          title="Not linked to your coach yet"
          description={resolvedDescription}
          action={{ label: 'Account settings', href: '/portal/account' }}
        />
      </CardContent>
    </Card>
  )
}
