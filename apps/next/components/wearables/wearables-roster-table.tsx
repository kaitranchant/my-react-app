'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { PersonRow } from '@/components/ui/person-row'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ClientWearableRosterRow } from '@/lib/wearable-queries'
import {
  formatWearableLastSynced,
  formatWearableMetricValue,
  formatWearableSleepHours,
  getRecoveryScoreVariant,
  getWearableConnectionStatusLabel,
  getWearableConnectionStatusVariant,
} from '@/lib/wearables'
import type {
  WearableConnectionFilter,
  WearableRosterSortDirection,
  WearableRosterSortKey,
} from '@/lib/validations/wearable'
import { cn } from '@/lib/utils'

type WearablesRosterTableProps = {
  rows: ClientWearableRosterRow[]
}

function SortButton({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
}: {
  label: string
  sortKey: WearableRosterSortKey
  activeSortKey: WearableRosterSortKey
  sortDirection: WearableRosterSortDirection
  onSort: (key: WearableRosterSortKey) => void
}) {
  const isActive = activeSortKey === sortKey
  const Icon = !isActive
    ? ArrowUpDown
    : sortDirection === 'asc'
      ? ArrowUp
      : ArrowDown

  return (
    <button
      type="button"
      className="hover:text-foreground inline-flex items-center gap-1 font-medium"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <Icon className="size-3.5 opacity-60" aria-hidden />
    </button>
  )
}

function compareNullableNumber(
  left: number | null,
  right: number | null,
  direction: WearableRosterSortDirection
) {
  if (left == null && right == null) return 0
  if (left == null) return 1
  if (right == null) return -1
  return direction === 'asc' ? left - right : right - left
}

function compareNullableString(
  left: string | null,
  right: string | null,
  direction: WearableRosterSortDirection
) {
  if (!left && !right) return 0
  if (!left) return 1
  if (!right) return -1
  const result = left.localeCompare(right, undefined, { sensitivity: 'base' })
  return direction === 'asc' ? result : -result
}

function sortRows(
  rows: ClientWearableRosterRow[],
  sortKey: WearableRosterSortKey,
  sortDirection: WearableRosterSortDirection
) {
  return [...rows].sort((left, right) => {
    switch (sortKey) {
      case 'provider':
        return compareNullableString(
          left.providerLabel,
          right.providerLabel,
          sortDirection
        )
      case 'last_synced_at':
        return compareNullableString(
          left.lastSyncedAt,
          right.lastSyncedAt,
          sortDirection
        )
      case 'sleep_hours':
        return compareNullableNumber(
          left.sleepHours,
          right.sleepHours,
          sortDirection
        )
      case 'hrv_ms':
        return compareNullableNumber(left.hrvMs, right.hrvMs, sortDirection)
      case 'recovery_score':
        return compareNullableNumber(
          left.recoveryScore,
          right.recoveryScore,
          sortDirection
        )
      case 'steps':
        return compareNullableNumber(left.steps, right.steps, sortDirection)
      default:
        return compareNullableString(
          left.clientName,
          right.clientName,
          sortDirection
        )
    }
  })
}

function filterRows(
  rows: ClientWearableRosterRow[],
  filter: WearableConnectionFilter,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase()

  return rows.filter((row) => {
    const isConnected =
      row.connectionStatus === 'connected' || row.connectionStatus === 'pending'

    if (filter === 'connected' && !isConnected) return false
    if (filter === 'not_connected' && isConnected) return false

    if (!normalizedQuery) return true
    return row.clientName.toLowerCase().includes(normalizedQuery)
  })
}

export function WearablesRosterTable({ rows }: WearablesRosterTableProps) {
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<WearableConnectionFilter>('all')
  const [sortKey, setSortKey] = React.useState<WearableRosterSortKey>('name')
  const [sortDirection, setSortDirection] =
    React.useState<WearableRosterSortDirection>('asc')

  const connectedCount = rows.filter(
    (row) =>
      row.connectionStatus === 'connected' || row.connectionStatus === 'pending'
  ).length

  const visibleRows = sortRows(
    filterRows(rows, filter, query),
    sortKey,
    sortDirection
  )

  function handleSort(nextKey: WearableRosterSortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextKey)
    setSortDirection(nextKey === 'name' || nextKey === 'provider' ? 'asc' : 'desc')
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No active clients</CardTitle>
          <CardDescription>
            Add clients to your roster to monitor wearable recovery data.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Roster</CardTitle>
            <CardDescription>
              {connectedCount} of {rows.length} athletes have a wearable
              connected or pending sync.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search athletes…"
              className="sm:w-56"
            />
            <Select
              value={filter}
              onValueChange={(value) =>
                setFilter(value as WearableConnectionFilter)
              }
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All athletes</SelectItem>
                <SelectItem value="connected">Connected / pending</SelectItem>
                <SelectItem value="not_connected">Not connected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="space-y-3 px-4 pb-4 md:hidden">
          {visibleRows.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No athletes match your filters.
            </p>
          ) : (
            visibleRows.map((row) => (
              <Card key={row.clientId} className="py-0 shadow-none">
                <CardContent className="space-y-3 p-4">
                  <PersonRow
                    name={row.clientName}
                    avatarUrl={row.avatarUrl}
                    href={`/clients/${row.clientId}`}
                  />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Device</p>
                      {row.providerLabel ? (
                        <div className="mt-0.5 space-y-1">
                          <p>{row.providerLabel}</p>
                          {row.connectionStatus ? (
                            <Badge
                              variant={getWearableConnectionStatusVariant(
                                row.connectionStatus
                              )}
                              className="text-[10px] font-normal"
                            >
                              {getWearableConnectionStatusLabel(
                                row.connectionStatus
                              )}
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Last sync</p>
                      <p className="mt-0.5">
                        {formatWearableLastSynced(row.lastSyncedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Sleep</p>
                      <p className="mt-0.5">
                        {formatWearableSleepHours(row.sleepHours)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">HRV</p>
                      <p className="mt-0.5">
                        {formatWearableMetricValue(row.hrvMs, 'ms')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Recovery</p>
                      <div className="mt-0.5">
                        {row.recoveryScore != null ? (
                          <Badge
                            variant={getRecoveryScoreVariant(row.recoveryScore)}
                            className="font-normal"
                          >
                            {row.recoveryScore}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Steps</p>
                      <p className="mt-0.5">
                        {formatWearableMetricValue(row.steps)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton
                  label="Athlete"
                  sortKey="name"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Device"
                  sortKey="provider"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Last sync"
                  sortKey="last_synced_at"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Sleep"
                  sortKey="sleep_hours"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="HRV"
                  sortKey="hrv_ms"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Recovery"
                  sortKey="recovery_score"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Steps"
                  sortKey="steps"
                  activeSortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  No athletes match your filters.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => (
                <TableRow key={row.clientId}>
                  <TableCell>
                    <PersonRow
                      name={row.clientName}
                      avatarUrl={row.avatarUrl}
                      href={`/clients/${row.clientId}`}
                    />
                  </TableCell>
                  <TableCell>
                    {row.providerLabel ? (
                      <div className="space-y-1">
                        <p className="text-sm">{row.providerLabel}</p>
                        {row.connectionStatus ? (
                          <Badge
                            variant={getWearableConnectionStatusVariant(
                              row.connectionStatus
                            )}
                            className="text-[10px] font-normal"
                          >
                            {getWearableConnectionStatusLabel(
                              row.connectionStatus
                            )}
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatWearableLastSynced(row.lastSyncedAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatWearableSleepHours(row.sleepHours)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatWearableMetricValue(row.hrvMs, 'ms')}
                  </TableCell>
                  <TableCell>
                    {row.recoveryScore != null ? (
                      <Badge
                        variant={getRecoveryScoreVariant(row.recoveryScore)}
                        className={cn('font-normal')}
                      >
                        {row.recoveryScore}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatWearableMetricValue(row.steps)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  )
}
