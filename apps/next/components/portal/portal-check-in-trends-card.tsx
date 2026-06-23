import {
  CheckInTrendsChart,
  CheckInTrendsSummary,
} from '@/components/check-ins/check-in-trends-chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { CheckInTrendPoint } from '@/lib/check-in-trends'

type PortalCheckInTrendsCardProps = {
  points: CheckInTrendPoint[]
}

export function PortalCheckInTrendsCard({
  points,
}: PortalCheckInTrendsCardProps) {
  if (points.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your wellness trends</CardTitle>
        <CardDescription>
          How sleep, energy, and soreness have changed across your recent
          check-ins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="md:hidden">
          <CheckInTrendsSummary points={points} />
        </div>
        <div className="hidden md:block">
          <CheckInTrendsChart points={points} />
        </div>
      </CardContent>
    </Card>
  )
}
