import Link from 'next/link'
import { redirect } from 'next/navigation'
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
import { ClientsPagination } from '@/components/clients/clients-pagination'
import { ClientRowActions } from '@/components/clients/client-row-actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { ClientInviteStatusBadge } from '@/components/clients/client-invite-status-badge'
import { StatusBadge } from '@/components/clients/status-badge'
import { PageHeader } from '@/components/dashboard/page-header'
import { CLIENTS_PAGE_SIZE } from '@/lib/constants'
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
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const { q, status, page: pageParam } = await searchParams
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('clients')
    .select('*', { count: 'exact' })
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

  const requestedPage = Math.max(
    1,
    Number.parseInt(pageParam ?? '1', 10) || 1
  )
  const from = (requestedPage - 1) * CLIENTS_PAGE_SIZE
  const to = from + CLIENTS_PAGE_SIZE - 1

  const { data, error, count } = await queryBuilder.range(from, to)
  const totalCount = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PAGE_SIZE))

  if (requestedPage > totalPages && totalCount > 0) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (totalPages > 1) params.set('page', String(totalPages))
    const query = params.toString()
    redirect(query ? `/clients?${query}` : '/clients')
  }

  const page = Math.min(requestedPage, totalPages)
  const clients = (data ?? []) as Client[]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Clients"
        description="Manage your roster of athletes and clients."
      />

      <ClientsToolbar />

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">
            {totalCount} client{totalCount === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="text-destructive p-6 text-sm">
              Could not load clients: {error.message}
            </p>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="bg-foreground text-background flex size-14 items-center justify-center rounded-sm">
                <Users className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No clients found</p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  {q || status
                    ? 'Try adjusting your search or filters.'
                    : 'Add your first client to get started.'}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead className="w-12 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell className="pl-5 font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-foreground hover:text-brand flex items-center gap-3 font-medium transition-colors"
                      >
                        <ClientAvatar
                          name={client.full_name}
                          avatarUrl={client.avatar_url}
                          size="sm"
                        />
                        {client.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={client.status} />
                    </TableCell>
                    <TableCell>
                      <ClientInviteStatusBadge status={client.invite_status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[16rem] truncate">
                      {client.goal ?? '—'}
                    </TableCell>
                    <TableCell className="pr-5">
                      <ClientRowActions client={client} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!error && totalCount > 0 && (
            <ClientsPagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              searchParams={{ q, status }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
