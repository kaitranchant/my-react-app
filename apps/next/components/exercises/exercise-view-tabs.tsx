'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'

const views = [
  { value: 'mine', label: 'My exercises' },
  { value: 'catalog', label: 'Browse catalog' },
] as const

export function ExerciseViewTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('view') === 'catalog' ? 'catalog' : 'mine'

  function hrefFor(view: (typeof views)[number]['value']) {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'mine') {
      params.delete('view')
    } else {
      params.set('view', view)
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return (
    <div className="flex flex-wrap gap-2">
      {views.map((view) => {
        const active = current === view.value
        return (
          <Link
            key={view.value}
            href={hrefFor(view.value)}
            className={cn(
              'filter-pill',
              active ? 'filter-pill-active' : 'filter-pill-inactive'
            )}
          >
            {view.label}
          </Link>
        )
      })}
    </div>
  )
}
