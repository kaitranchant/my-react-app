'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

const SEARCH_DEBOUNCE_MS = 300

export function MealLibrarySearchInput({
  defaultQuery = '',
}: {
  defaultQuery?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = React.useState(defaultQuery)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    setValue(defaultQuery)
  }, [defaultQuery])

  const pushQuery = React.useCallback(
    (nextQuery: string) => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = nextQuery.trim()
      if (trimmed) {
        params.set('q', trimmed)
      } else {
        params.delete('q')
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value
    setValue(nextValue)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      pushQuery(nextValue)
    }, SEARCH_DEBOUNCE_MS)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    pushQuery(value)
  }

  return (
    <div className="relative">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Search meals…"
        className="pl-9"
        aria-label="Search meals"
      />
    </div>
  )
}
