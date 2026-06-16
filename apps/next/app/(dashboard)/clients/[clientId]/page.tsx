import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { StatusBadge } from '@/components/clients/status-badge'
import type { Client } from 'app/types/database'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle()

  if (!data) {
    notFound()
  }

  const client = data as Client

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link
        href="/clients"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        Back to clients
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.full_name}
            </h1>
            <StatusBadge status={client.status} />
          </div>
          {client.email && (
            <p className="text-muted-foreground text-sm">{client.email}</p>
          )}
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

      <ClientDetailTabs client={client} />
    </div>
  )
}
