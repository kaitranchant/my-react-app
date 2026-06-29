import { ProgressiveOverloadInbox } from '@/components/progressive-overload/progressive-overload-inbox'
import { PageHeader } from '@/components/dashboard/page-header'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { fetchProgressiveOverloadSuggestions } from '@/lib/progressive-overload'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionGate } from '@/lib/subscription-server'

export const metadata = {
  title: 'Progressive Overload — Coaching App',
}

export default async function ProgressiveOverloadPage() {
  const gate = await getSubscriptionGate('progressive_overload')
  if (!gate.allowed) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <PageHeader
          title="Progressive overload"
          description="Review suggested load increases from last week's sessions. Approve to set target weights on upcoming auto-progress exercises."
        />
        <UpgradePrompt gate={gate} />
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const coachPreferences = user
    ? await getCoachPreferencesForUser(user.id)
    : null

  const { suggestions, weekLabel, schemaError } = user
    ? await fetchProgressiveOverloadSuggestions(
        supabase,
        user.id,
        coachPreferences!
      )
    : { suggestions: [], weekLabel: 'Last week', schemaError: null }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title="Progressive overload"
        description="Review suggested load increases from last week's sessions. Approve to set target weights on upcoming auto-progress exercises."
      />

      <ProgressiveOverloadInbox
        suggestions={suggestions}
        weekLabel={weekLabel}
        weightUnit={coachPreferences?.weightUnit ?? 'lbs'}
        schemaError={schemaError}
      />
    </div>
  )
}
