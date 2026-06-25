import { CalendarDays } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export function PortalNoProgramCard() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="text-brand size-4" />
          Your program
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={CalendarDays}
          title="No program assigned yet"
          description="Your coach will assign a training program here. You can still view your calendar and log any scheduled workouts."
          action={{ label: 'View calendar', href: '/portal/workouts' }}
          className="py-4"
        />
      </CardContent>
    </Card>
  )
}
