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
  requireGymMembership = false,
}: {
  control: Control<T>
  name: FieldPath<T>
  gyms: GymOption[]
  requireGymMembership?: boolean
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
          <Select
            onValueChange={field.onChange}
            value={field.value ?? (requireGymMembership ? gyms[0]?.id : 'none')}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    requireGymMembership ? 'Select a gym' : 'Personal only'
                  }
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {requireGymMembership ? null : (
                <SelectItem value="none">Personal only</SelectItem>
              )}
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
