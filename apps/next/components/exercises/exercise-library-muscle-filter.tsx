'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ExerciseLibraryMuscleFilterProps = {
  options: string[]
}

export function ExerciseLibraryMuscleFilter({
  options,
}: ExerciseLibraryMuscleFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const muscleParam = searchParams.get('muscle')
  const selectedMuscle =
    options.find(
      (option) => option.toLowerCase() === (muscleParam ?? '').toLowerCase()
    ) ?? 'all'

  function updateMuscle(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('muscle')
    } else {
      params.set('muscle', value)
    }
    params.delete('page')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <Select value={selectedMuscle} onValueChange={updateMuscle}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder="Muscle group" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All muscle groups</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
