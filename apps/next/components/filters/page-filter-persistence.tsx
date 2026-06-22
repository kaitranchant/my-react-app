'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  clearPersistedFilters,
  filtersFromSearchParams,
  readPersistedFilters,
  writePersistedFilters,
} from '@/lib/persisted-filters'
import { cn } from '@/lib/utils'

type PageFilterPersistenceProps = {
  pageKey: string
  filterKeys: readonly string[]
  defaultValues?: Record<string, string>
}

export function PageFilterPersistence({
  pageKey,
  filterKeys,
  defaultValues = {},
}: PageFilterPersistenceProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const readyRef = React.useRef(false)

  const defaultValuesRef = React.useRef(defaultValues)
  defaultValuesRef.current = defaultValues

  React.useEffect(() => {
    if (readyRef.current) return

    const defaults = defaultValuesRef.current
    const hasFilterInUrl = filterKeys.some((key) => searchParams.has(key))
    if (hasFilterInUrl) {
      readyRef.current = true
      writePersistedFilters(
        pageKey,
        filtersFromSearchParams(searchParams, filterKeys, defaults)
      )
      return
    }

    const stored = readPersistedFilters(pageKey)
    if (stored && Object.keys(stored).length > 0) {
      const params = new URLSearchParams(searchParams.toString())
      for (const key of filterKeys) {
        const value = stored[key]
        if (value) {
          params.set(key, value)
        }
      }
      readyRef.current = true
      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname
      )
      return
    }

    readyRef.current = true
  }, [filterKeys, pageKey, pathname, router, searchParams])

  React.useEffect(() => {
    if (!readyRef.current) return
    writePersistedFilters(
      pageKey,
      filtersFromSearchParams(
        searchParams,
        filterKeys,
        defaultValuesRef.current
      )
    )
  }, [filterKeys, pageKey, searchParams])

  return null
}

type ClearPageFiltersProps = {
  pageKey: string
  filterKeys: readonly string[]
  preserveKeys?: readonly string[]
  className?: string
}

export function ClearPageFilters({
  pageKey,
  filterKeys,
  preserveKeys = [],
  className,
}: ClearPageFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const hasActiveFilters = filterKeys.some((key) => searchParams.has(key))
  if (!hasActiveFilters) return null

  function handleClear() {
    const params = new URLSearchParams(searchParams.toString())
    for (const key of filterKeys) {
      if (preserveKeys.includes(key)) continue
      params.delete(key)
    }
    clearPersistedFilters(pageKey)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <button
      type="button"
      onClick={handleClear}
      className={cn(
        'text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline',
        className
      )}
    >
      Clear filters
    </button>
  )
}
