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

export function ClientCoachingTypeField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>
  name: FieldPath<T>
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Client type</FormLabel>
          <Select onValueChange={field.onChange} value={field.value ?? ''}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="in_person">In-person</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
