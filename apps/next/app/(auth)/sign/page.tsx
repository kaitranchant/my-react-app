import { DocumentSigningFlow } from '@/components/onboarding/document-signing-flow'
import { getOnboardingSignSession } from '@/app/(dashboard)/clients/onboarding-actions'

export const metadata = {
  title: 'Sign documents — Coaching App',
}

export default async function PublicSignPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Invalid signing link</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This link is missing or incomplete. Ask your coach to send a new one.
        </p>
      </div>
    )
  }

  const session = await getOnboardingSignSession({ token })

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
        clientId={session.preview.clientId}
        preview={session.preview}
        documents={session.documents}
        token={token}
        mode="public"
      />
    </div>
  )
}
