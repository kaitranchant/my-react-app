import { Watch } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type WearablesComingSoonProps = {
  audience: 'coach' | 'client'
}

export function WearablesComingSoon({ audience }: WearablesComingSoonProps) {
  const description =
    audience === 'coach'
      ? 'Monitor athlete sleep, HRV, recovery, and activity from connected wearables. Whoop and Apple Health support is rolling out soon.'
      : 'Connect your Whoop band or Apple Health to share sleep, recovery, and activity with your coach. This is rolling out soon.'

  return (
    <Card>
      <CardHeader className="items-center gap-3 text-center">
        <span className="bg-brand/10 text-brand inline-flex size-12 items-center justify-center rounded-xl">
          <Watch className="size-6" aria-hidden />
        </span>
        <div className="space-y-2">
          <Badge variant="secondary">Coming soon</Badge>
          <CardTitle className="text-lg">Wearables</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="text-muted-foreground pb-8 text-center text-xs leading-relaxed">
        Garmin, Oura, and Fitbit are planned after the first integrations launch.
      </CardContent>
    </Card>
  )
}
