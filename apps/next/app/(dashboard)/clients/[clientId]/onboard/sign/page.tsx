import { notFound } from 'next/navigation'

import { DocumentSigningFlow } from '@/components/onboarding/document-signing-flow'
import { getOnboardingSignSession } from '@/app/(dashboard)/clients/onboarding-actions'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Sign documents — Coaching App',
}

export default async function CoachInPersonSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ packet?: string }>
}) {
  const { clientId } = await params
  const { packet: packetId } = await searchParams

  if (!packetId) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (!client) {
    notFound()
  }

  const session = await getOnboardingSignSession({ packetId })

  if (!session.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Unable to open documents</h1>
        <p className="text-muted-foreground mt-2 text-sm">{session.error}</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-8 sm:py-12">
      <DocumentSigningFlow
        clientId={clientId}
        preview={session.preview}
        documents={session.documents}
        packetId={packetId}
        mode="coach"
      />
    </div>
  )
}
