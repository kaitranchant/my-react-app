import { createClient } from '@/lib/supabase/server'
import { fetchCoachLoadSummaries } from '@/lib/load-queries'
import { LoadDashboard } from '@/components/load/load-dashboard'
import { PageHeader } from '@/components/dashboard/page-header'
import type { Client } from 'app/types/database'

export const metadata = {
  title: 'Load Management — Coaching App',
}

export default async function LoadPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: initialClientId } = await searchParams
  const supabase = await createClient()

  const { data: clientsData } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  const clients = (clientsData ?? []) as Pick<Client, 'id' | 'full_name'>[]
  const summaries = await fetchCoachLoadSummaries(supabase, clients)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Load Management"
        description="Monitor training load, ACWR risk, session compliance, and readiness across your roster."
      />
      <LoadDashboard
        summaries={summaries}
        initialClientId={initialClientId ?? null}
      />
    </div>
  )
}
