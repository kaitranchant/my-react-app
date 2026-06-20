'use client'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

type GymOption = {
  id: string
  name: string
}

export function ClientGymField<T extends FieldValues>({
  control,
  name,
  gyms,
}: {
  control: Control<T>
  name: FieldPath<T>
  gyms: GymOption[]
}) {
  if (gyms.length === 0) {
    return null
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Gym membership</FormLabel>
          <Select onValueChange={field.onChange} value={field.value ?? 'none'}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Personal only" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">Personal only</SelectItem>
              {gyms.map((gym) => (
                <SelectItem key={gym.id} value={gym.id}>
                  Add to {gym.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
