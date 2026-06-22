import { Suspense } from 'react'

import { createClient } from '@/lib/supabase/server'
import { GymJoinClient } from '@/components/gym/gym-join-client'
import { GymJoinBreadcrumbs } from '@/components/navigation/detail-breadcrumbs'

export const metadata = {
  title: 'Join gym — Coaching App',
}

const INVITE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function GymJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  if (!invite || !INVITE_TOKEN_PATTERN.test(invite)) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8">
        <Suspense fallback={null}>
          <GymJoinBreadcrumbs />
        </Suspense>
        <Suspense fallback={null}>
          <GymJoinClient invalid />
        </Suspense>
      </div>
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_gym_invite_preview', {
    p_token: invite,
  })

  const row = data?.[0]

  if (error || !row?.email) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8">
        <Suspense fallback={null}>
          <GymJoinBreadcrumbs />
        </Suspense>
        <Suspense fallback={null}>
          <GymJoinClient invalid token={invite} />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-8">
      <Suspense fallback={null}>
        <GymJoinBreadcrumbs gymName={row.gym_name} />
      </Suspense>
      <Suspense fallback={null}>
        <GymJoinClient
          gymName={row.gym_name}
          inviterName={row.inviter_name}
          token={invite}
        />
      </Suspense>
    </div>
  )
}
