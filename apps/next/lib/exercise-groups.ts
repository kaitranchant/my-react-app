import type { ScheduledExerciseBlock } from 'app/types/database'

export const SUPERSET_GROUP_OPTIONS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export const EXERCISE_BLOCK_OPTIONS: {
  value: ScheduledExerciseBlock
  label: string
  description: string
}[] = [
  {
    value: 'warmup',
    label: 'Warm-up',
    description: 'Prep work before the main session.',
  },
  {
    value: 'activation',
    label: 'Activation',
    description: 'Primers and movement prep.',
  },
  {
    value: 'main_lift',
    label: 'Main lift',
    description: 'Primary strength or skill work.',
  },
  {
    value: 'accessory',
    label: 'Accessory',
    description: 'Supporting lifts after the main work.',
  },
  {
    value: 'core',
    label: 'Core',
    description: 'Trunk and stability work.',
  },
  {
    value: 'conditioning',
    label: 'Conditioning',
    description: 'Metabolic or cardio intervals.',
  },
  {
    value: 'mobility',
    label: 'Mobility',
    description: 'Flexibility and range-of-motion work.',
  },
  {
    value: 'cooldown',
    label: 'Cooldown',
    description: 'Down-regulation after training.',
  },
  {
    value: 'finisher',
    label: 'Finisher',
    description: 'Optional final challenge or pump work.',
  },
]

export function getExerciseBlockLabel(
  block: ScheduledExerciseBlock | null | undefined
): string | null {
  if (!block) return null
  return EXERCISE_BLOCK_OPTIONS.find((option) => option.value === block)?.label ?? block
}

export function isScheduledExerciseBlock(
  value: string
): value is ScheduledExerciseBlock {
  return EXERCISE_BLOCK_OPTIONS.some((option) => option.value === value)
}
