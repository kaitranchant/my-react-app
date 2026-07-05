'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MealLibraryNumericRange } from '@/lib/meal-library-filters'

type MealLibraryMacroRangeFilterProps = {
  param: 'protein' | 'carbs' | 'fat'
  ranges: readonly MealLibraryNumericRange[]
  allLabel: string
  placeholder: string
}

export function MealLibraryMacroRangeFilter({
  param,
  ranges,
  allLabel,
  placeholder,
}: MealLibraryMacroRangeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const paramValue = searchParams.get(param)
  const selectedRange =
    ranges.find((range) => range.key === paramValue)?.key ?? 'all'

  function updateRange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(param)
    } else {
      params.set(param, value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Select value={selectedRange} onValueChange={updateRange}>
      <SelectTrigger className="w-full min-w-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {ranges.map((range) => (
          <SelectItem key={range.key} value={range.key}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
