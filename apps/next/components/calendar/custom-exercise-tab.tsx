'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { exerciseFormSchema } from '@/lib/validations/exercise'

export const customExerciseQuickSchema = z.object({
  name: z.string().trim().min(1, 'Exercise name is required.').max(120),
  muscleGroup: z.string().trim().max(80).optional(),
  equipment: z.string().trim().max(80).optional(),
  instructions: z.string().trim().max(2000).optional(),
  demoVideoUrl: exerciseFormSchema.shape.demoVideoUrl,
  saveToLibrary: z.boolean(),
})

export type CustomExerciseQuickValues = z.infer<typeof customExerciseQuickSchema>

export const customExerciseQuickDefaults: CustomExerciseQuickValues = {
  name: '',
  muscleGroup: '',
  equipment: '',
  instructions: '',
  demoVideoUrl: '',
  saveToLibrary: true,
}

type CustomExerciseTabProps = {
  form: ReturnType<typeof useForm<CustomExerciseQuickValues>>
}

export function CustomExerciseTab({ form }: CustomExerciseTabProps) {
  const saveToLibrary = form.watch('saveToLibrary')

  return (
    <Form {...form}>
      <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Create a one-off or reusable movement when it is not in the catalog or
        your library yet.
      </p>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Exercise name</FormLabel>
            <FormControl>
              <Input placeholder="Landmine press, sled push…" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="muscleGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Muscle group</FormLabel>
              <FormControl>
                <Input placeholder="Chest, glutes…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="equipment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment</FormLabel>
              <FormControl>
                <Input placeholder="Dumbbells, cable…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="instructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Instructions (optional)</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Setup, cues, and form notes…"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="demoVideoUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Form video link (optional)</FormLabel>
            <FormControl>
              <Input
                type="url"
                inputMode="url"
                placeholder="https://youtu.be/… or Vimeo / direct video URL"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Clients can open this link to check form when logging the workout.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="saveToLibrary"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-3">
            <FormControl>
              <input
                type="checkbox"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                className="mt-1 size-4 rounded border"
              />
            </FormControl>
            <div className="space-y-1">
              <FormLabel className="font-medium">Save to my library</FormLabel>
              <FormDescription className="text-[11px] leading-snug">
                {saveToLibrary
                  ? 'This exercise will appear under My library for future workouts.'
                  : 'Used for this workout only — it will not appear in your library list.'}
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
      </div>
    </Form>
  )
}
