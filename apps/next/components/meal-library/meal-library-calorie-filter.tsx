'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MEAL_LIBRARY_CALORIE_RANGES } from '@/lib/meal-library-filters'

export function MealLibraryCalorieFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const caloriesParam = searchParams.get('calories')
  const selectedRange =
    MEAL_LIBRARY_CALORIE_RANGES.find((range) => range.key === caloriesParam)
      ?.key ?? 'all'

  function updateRange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('calories')
    } else {
      params.set('calories', value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Select value={selectedRange} onValueChange={updateRange}>
      <SelectTrigger className="w-full min-w-0">
        <SelectValue placeholder="Calories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All calories</SelectItem>
        {MEAL_LIBRARY_CALORIE_RANGES.map((range) => (
          <SelectItem key={range.key} value={range.key}>
            {range.label} kcal
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
