import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

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
import { AddProgramButton } from '@/components/programs/program-form-dialog'
import { ProgramRowActions } from '@/components/programs/program-row-actions'
import { ProgramStatusBadge } from '@/components/programs/program-status-badge'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import { programStatuses } from '@/lib/validations/program'
import type { Program, ProgramStatus } from 'app/types/database'

export const metadata = {
  title: 'Programs — Library — Coaching App',
}

function isStatus(value: string): value is ProgramStatus {
  return (programStatuses as readonly string[]).includes(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function LibraryProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('programs')
    .select('*')
    .order('updated_at', { ascending: false })

  if (status && isStatus(status)) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  const { data, error } = await queryBuilder
  const programs = (data ?? []) as Program[]

  const { data: assignmentRows } = await supabase
    .from('program_assignments')
    .select('program_id')
    .eq('status', 'active')

  const assignmentCounts = new Map<string, number>()
  for (const row of assignmentRows ?? []) {
    assignmentCounts.set(
      row.program_id,
      (assignmentCounts.get(row.program_id) ?? 0) + 1
    )
  }

  const statusFilters: { label: string; value?: ProgramStatus }[] = [
    { label: 'All' },
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Multi-week programs — build a calendar, then assign to clients.
        </p>
        <AddProgramButton />
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const active = filter.value ? status === filter.value : !status
          const href = filter.value
            ? `/library/programs?status=${filter.value}`
            : '/library/programs'
          return (
            <Link
              key={filter.label}
              href={href}
                  className={
                    active
                      ? 'filter-pill filter-pill-active'
                      : 'filter-pill filter-pill-inactive'
                  }
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">
            {programs.length} program{programs.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <LibraryLoadError
              resource="programs"
              error={error}
              sqlFile="apply-programs.sql"
            />
          ) : programs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="empty-state-icon">
                <ClipboardList className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No programs yet</p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  {status
                    ? 'No programs match this filter.'
                    : 'Create your first program template to assign to clients.'}
                </p>
              </div>
              {!status && (
                <div className="pt-2">
                  <AddProgramButton />
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((program) => (
                  <TableRow key={program.id} className="group">
                    <TableCell className="pl-5">
                      <div className="space-y-0.5">
                        <Link
                          href={`/library/programs/${program.id}`}
                          className="font-medium hover:underline"
                        >
                          {program.name}
                        </Link>
                        {program.description && (
                          <p className="text-muted-foreground max-w-md truncate text-xs">
                            {program.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ProgramStatusBadge status={program.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {assignmentCounts.get(program.id) ?? 0} client
                      {(assignmentCounts.get(program.id) ?? 0) === 1 ? '' : 's'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(program.updated_at)}
                    </TableCell>
                    <TableCell className="pr-5">
                      <ProgramRowActions program={program} />
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
