import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { StatusBadge } from '@/components/clients/status-badge'
import type { Client } from 'app/types/database'

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

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
          <div className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold">
            {initials(client.full_name)}
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">
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

      <ClientDetailTabs client={client} />
    </div>
  )
}
