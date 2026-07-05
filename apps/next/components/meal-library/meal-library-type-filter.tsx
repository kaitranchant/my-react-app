'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition'
import { mealTypes } from '@/lib/validations/nutrition'
import type { MealType } from 'app/types/database'

export function MealLibraryTypeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const typeParam = searchParams.get('type')
  const selectedType =
    mealTypes.find((type) => type === typeParam) ?? 'all'

  function updateType(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('type')
    } else {
      params.set('type', value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Select value={selectedType} onValueChange={updateType}>
      <SelectTrigger className="w-full min-w-0">
        <SelectValue placeholder="Meal type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All meal types</SelectItem>
        {mealTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {MEAL_TYPE_LABELS[type as MealType]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
