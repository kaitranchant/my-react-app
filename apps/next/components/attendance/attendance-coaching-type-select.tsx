'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { clientCoachingTypes } from '@/lib/validations/client'
import { cn } from '@/lib/utils'
import type { ClientCoachingType } from 'app/types/database'

const labels: Record<ClientCoachingType, string> = {
  online: 'Online',
  in_person: 'In-person',
  hybrid: 'Hybrid',
}

type AttendanceCoachingTypeSelectProps = {
  value: ClientCoachingType | null
  defaultCoachingType?: ClientCoachingType | null
  onValueChange: (value: ClientCoachingType | null) => void
  disabled?: boolean
  className?: string
}

export function AttendanceCoachingTypeSelect({
  value,
  defaultCoachingType,
  onValueChange,
  disabled = false,
  className,
}: AttendanceCoachingTypeSelectProps) {
  const selectValue = value ?? defaultCoachingType ?? 'none'

  return (
    <Select
      value={selectValue}
      onValueChange={(next) =>
        onValueChange(next === 'none' ? null : (next as ClientCoachingType))
      }
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-[8.75rem] shrink-0 [&_[data-slot=select-value]]:line-clamp-none',
          className
        )}
      >
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Default</SelectItem>
        {clientCoachingTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {labels[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
