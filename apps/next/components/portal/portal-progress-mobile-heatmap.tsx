'use client'

import * as React from 'react'
import { ArrowRight } from 'lucide-react'

import { PortalTrainingConsistencyHeatmap } from '@/components/portal/portal-training-consistency-heatmap'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { TrainingConsistencyHeatmap } from '@/lib/training-consistency'
import type { WeekStartsOn } from 'app/types/database'

type PortalProgressMobileHeatmapProps = {
  heatmap: TrainingConsistencyHeatmap
  weekStartsOn?: WeekStartsOn
}

export function PortalProgressMobileHeatmap({
  heatmap,
  weekStartsOn = 'monday',
}: PortalProgressMobileHeatmapProps) {
  const [fullYear, setFullYear] = React.useState(false)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Training consistency</CardTitle>
        <button
          type="button"
          onClick={() => setFullYear((current) => !current)}
          className="text-brand inline-flex shrink-0 items-center gap-1 text-xs font-medium"
        >
          {fullYear ? 'Recent weeks' : 'Full year'}
          <ArrowRight className="size-3.5" />
        </button>
      </CardHeader>
      <CardContent className="pt-0">
        <PortalTrainingConsistencyHeatmap
          heatmap={heatmap}
          weekStartsOn={weekStartsOn}
          compact={!fullYear}
          achievementColors
          hideMissedLegend
          portalFooter
        />
      </CardContent>
    </Card>
  )
}
