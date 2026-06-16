import Link from 'next/link'
import { Users } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientsToolbar } from '@/components/clients/clients-toolbar'
import { ClientRowActions } from '@/components/clients/client-row-actions'
import { StatusBadge } from '@/components/clients/status-badge'
import { clientStatuses } from '@/lib/validations/client'
import type { Client, ClientStatus } from 'app/types/database'

export const metadata = {
  title: 'Clients — Coaching App',
}

function isStatus(value: string): value is ClientStatus {
  return (clientStatuses as readonly string[]).includes(value)
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (q && q.trim()) {
    const term = `%${q.trim()}%`
    queryBuilder = queryBuilder.or(
      `full_name.ilike.${term},email.ilike.${term}`
    )
  }

  if (status && isStatus(status)) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  const { data, error } = await queryBuilder
  const clients = (data ?? []) as Client[]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground text-sm">
          Manage your roster of athletes and clients.
        </p>
      </div>

      <ClientsToolbar />

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">
            {clients.length} client{clients.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="text-destructive p-6 text-sm">
              Could not load clients: {error.message}
            </p>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                <Users className="size-6" />
              </div>
              <p className="font-medium">No clients found</p>
              <p className="text-muted-foreground text-sm">
                {q || status
                  ? 'Try adjusting your search or filters.'
                  : 'Add your first client to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="hover:underline"
                      >
                        {client.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={client.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[16rem] truncate">
                      {client.goal ?? '—'}
                    </TableCell>
                    <TableCell>
                      <ClientRowActions client={client} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
