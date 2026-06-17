import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { ClientAccountCard } from '@/components/clients/client-account-card'
import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { StatusBadge } from '@/components/clients/status-badge'
import type { Client, ClientProgramAssignment, Program } from 'app/types/database'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()

  const [
    { data },
    { data: assignmentData },
    { data: programsData },
  ] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).maybeSingle(),
    supabase
      .from('program_assignments')
      .select('*, program:programs(id, name, description, status)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('programs')
      .select('id, name, status')
      .order('name', { ascending: true }),
  ])

  if (!data) {
    notFound()
  }

  const client = data as Client
  const activeAssignment = assignmentData
    ? (assignmentData as ClientProgramAssignment)
    : null
  const availablePrograms = (programsData ?? []) as Pick<
    Program,
    'id' | 'name' | 'status'
  >[]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Link
        href="/clients"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ClientAvatarUpload
            clientId={client.id}
            name={client.full_name}
            avatarUrl={client.avatar_url}
            size="lg"
          />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight uppercase">
                {client.full_name}
              </h1>
              <StatusBadge status={client.status} />
            </div>
            {client.email && (
              <p className="text-muted-foreground text-sm">{client.email}</p>
            )}
          </div>
        </div>
        <ClientFormDialog
          client={client}
          trigger={
            <Button variant="outline">
              <Pencil className="size-4" />
              Edit
            </Button>
          }
        />
      </div>

      <ClientAccountCard client={client} />

      <ClientDetailTabs
        client={client}
        activeAssignment={activeAssignment}
        availablePrograms={availablePrograms}
      />
    </div>
  )
}
