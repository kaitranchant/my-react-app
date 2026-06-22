'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

export function TeamsToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = React.useState(searchParams.get('q') ?? '')

  function updateQuery(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value.trim()) {
      params.delete('q')
    } else {
      params.set('q', value.trim())
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      const current = searchParams.get('q') ?? ''
      if (query !== current) {
        updateQuery(query)
      }
    }, 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search teams…"
        className="pl-9"
      />
    </div>
  )
}
