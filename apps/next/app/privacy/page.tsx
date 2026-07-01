import { MarketingSiteHeader } from '@/components/legal/marketing-site-header'
import { PrivacyPolicyContent } from '@/components/legal/privacy-policy-content'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Privacy Policy — SwiftCoach',
  description: 'How SwiftCoach collects, uses, and protects your personal information.',
}

export default async function PrivacyPolicyPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen">
      <MarketingSiteHeader isSignedIn={Boolean(user)} />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <PrivacyPolicyContent />
      </main>
    </div>
  )
}
