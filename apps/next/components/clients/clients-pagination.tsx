'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ClientsPaginationProps = {
  page: number
  totalPages: number
  totalCount: number
  searchParams: { q?: string; status?: string }
}

function buildHref(
  page: number,
  searchParams: ClientsPaginationProps['searchParams']
) {
  const params = new URLSearchParams()
  if (searchParams.q) params.set('q', searchParams.q)
  if (searchParams.status) params.set('status', searchParams.status)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `/clients?${query}` : '/clients'
}

export function ClientsPagination({
  page,
  totalPages,
  totalCount,
  searchParams,
}: ClientsPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages} · {totalCount} client
        {totalCount === 1 ? '' : 's'}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          asChild={page > 1}
        >
          {page > 1 ? (
            <Link href={buildHref(page - 1, searchParams)}>
              <ChevronLeft className="size-4" />
              Previous
            </Link>
          ) : (
            <>
              <ChevronLeft className="size-4" />
              Previous
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          asChild={page < totalPages}
        >
          {page < totalPages ? (
            <Link href={buildHref(page + 1, searchParams)}>
              Next
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <>
              Next
              <ChevronRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
