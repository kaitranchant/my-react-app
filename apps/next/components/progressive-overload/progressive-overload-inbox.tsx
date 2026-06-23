'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, TrendingUp, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  approveAllProgressiveOverloadSuggestions,
  approveProgressiveOverloadSuggestion,
  dismissProgressiveOverloadSuggestion,
} from '@/app/(dashboard)/progressive-overload/actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatTargetWeight } from '@/lib/progressive-overload'
import type { ProgressiveOverloadSuggestion } from '@/lib/progressive-overload'
import type { WeightUnit } from 'app/types/database'

type ProgressiveOverloadInboxProps = {
  suggestions: ProgressiveOverloadSuggestion[]
  weekLabel: string
  weightUnit: WeightUnit
  schemaError?: string | null
}

function toActionInput(suggestion: ProgressiveOverloadSuggestion) {
  return {
    clientId: suggestion.clientId,
    exerciseId: suggestion.exerciseId,
    sourceWorkoutId: suggestion.sourceWorkoutId,
    sourceScheduledExerciseId: suggestion.sourceScheduledExerciseId,
    sourceSessionDate: suggestion.sourceSessionDate,
    previousWeight: suggestion.previousWeight,
    suggestedWeight: suggestion.suggestedWeight,
  }
}

function formatSessionDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function ProgressiveOverloadInbox({
  suggestions,
  weekLabel,
  weightUnit,
  schemaError = null,
}: ProgressiveOverloadInboxProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [bulkPending, setBulkPending] = React.useState(false)

  async function handleApprove(suggestion: ProgressiveOverloadSuggestion) {
    setPendingId(suggestion.sourceScheduledExerciseId)
    const result = await approveProgressiveOverloadSuggestion(toActionInput(suggestion))
    setPendingId(null)

    if (result.success) {
      toast.success(
        result.updatedCount
          ? `Applied ${formatTargetWeight(suggestion.suggestedWeight, weightUnit)} to ${result.updatedCount} upcoming session${result.updatedCount === 1 ? '' : 's'}.`
          : 'Suggestion approved.'
      )
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  async function handleDismiss(suggestion: ProgressiveOverloadSuggestion) {
    setPendingId(suggestion.sourceScheduledExerciseId)
    const result = await dismissProgressiveOverloadSuggestion(toActionInput(suggestion))
    setPendingId(null)

    if (result.success) {
      toast.success('Suggestion dismissed.')
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  async function handleApproveAll() {
    setBulkPending(true)
    const result = await approveAllProgressiveOverloadSuggestions(
      suggestions.map(toActionInput)
    )
    setBulkPending(false)

    if (result.success) {
      toast.success(
        `Approved ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}.`
      )
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  if (schemaError?.includes('Could not find the table')) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
          Progressive overload review requires a database update. Run{' '}
          <code className="text-foreground">apply-progressive-overload.sql</code>{' '}
          in Supabase, then refresh.
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No load increases to review"
        description={`When clients hit all rep targets last week on auto-progress exercises, suggested bumps will appear here for your approval.`}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'} from{' '}
          {weekLabel.toLowerCase()}
        </p>
        {suggestions.length > 1 ? (
          <Button
            type="button"
            variant="brand"
            size="sm"
            disabled={bulkPending}
            onClick={handleApproveAll}
          >
            Approve all
          </Button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {suggestions.map((suggestion) => {
          const isPending = pendingId === suggestion.sourceScheduledExerciseId

          return (
            <li key={suggestion.sourceScheduledExerciseId}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <ClientAvatar
                        name={suggestion.clientName}
                        avatarUrl={suggestion.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="text-base">
                          {suggestion.exerciseName}
                        </CardTitle>
                        <CardDescription className="leading-relaxed">
                          <Link
                            href={`/clients/${suggestion.clientId}`}
                            className="font-medium text-foreground hover:text-brand"
                          >
                            {suggestion.clientName}
                          </Link>
                          {' · '}
                          {suggestion.sourceWorkoutName} on{' '}
                          {formatSessionDate(suggestion.sourceSessionDate)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {suggestion.upcomingSessionCount} upcoming
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-muted-foreground text-xs">Last week</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatTargetWeight(suggestion.previousWeight, weightUnit)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
                      <p className="text-muted-foreground text-xs">Suggested</p>
                      <p className="text-brand text-lg font-semibold tabular-nums">
                        {formatTargetWeight(suggestion.suggestedWeight, weightUnit)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">Increase</p>
                      <p className="text-lg font-semibold tabular-nums">
                        +
                        {formatTargetWeight(
                          suggestion.suggestedWeight - suggestion.previousWeight,
                          weightUnit
                        )}
                      </p>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Client hit all prescribed reps at{' '}
                    {formatTargetWeight(suggestion.previousWeight, weightUnit)}. Approving
                    sets that target on upcoming auto-progress sessions this week.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="brand"
                      size="sm"
                      disabled={isPending || bulkPending}
                      onClick={() => handleApprove(suggestion)}
                    >
                      <Check className="size-4" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || bulkPending}
                      onClick={() => handleDismiss(suggestion)}
                    >
                      <X className="size-4" />
                      Dismiss
                    </Button>
                    <Button type="button" variant="ghost" size="sm" asChild>
                      <Link href={`/clients/${suggestion.clientId}/calendar`}>
                        View calendar
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
