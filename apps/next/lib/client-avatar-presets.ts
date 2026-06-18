import type { LucideIcon } from 'lucide-react'
import {
  Bike,
  BicepsFlexed,
  Dumbbell,
  Flame,
  HeartPulse,
  Mountain,
  SportShoe,
  Target,
  Trophy,
  Volleyball,
} from 'lucide-react'

export type ClientAvatarPresetId =
  | 'dumbbell'
  | 'running'
  | 'bike'
  | 'heart'
  | 'flame'
  | 'trophy'
  | 'mountain'
  | 'target'
  | 'powerlifting'
  | 'basketball'

export type ClientAvatarPreset = {
  id: ClientAvatarPresetId
  label: string
  icon: LucideIcon
  className: string
}

const PRESET_PREFIX = 'preset:'

export const CLIENT_AVATAR_PRESETS: ClientAvatarPreset[] = [
  {
    id: 'dumbbell',
    label: 'Strength',
    icon: Dumbbell,
    className: 'bg-slate-700 text-white',
  },
  {
    id: 'running',
    label: 'Running',
    icon: SportShoe,
    className: 'bg-sky-600 text-white',
  },
  {
    id: 'bike',
    label: 'Cycling',
    icon: Bike,
    className: 'bg-emerald-600 text-white',
  },
  {
    id: 'heart',
    label: 'Cardio',
    icon: HeartPulse,
    className: 'bg-rose-600 text-white',
  },
  {
    id: 'flame',
    label: 'HIIT',
    icon: Flame,
    className: 'bg-orange-500 text-white',
  },
  {
    id: 'trophy',
    label: 'Competition',
    icon: Trophy,
    className: 'bg-amber-500 text-white',
  },
  {
    id: 'mountain',
    label: 'Outdoor',
    icon: Mountain,
    className: 'bg-teal-600 text-white',
  },
  {
    id: 'target',
    label: 'Goals',
    icon: Target,
    className: 'bg-indigo-600 text-white',
  },
  {
    id: 'powerlifting',
    label: 'Powerlifting',
    icon: BicepsFlexed,
    className: 'bg-violet-600 text-white',
  },
  {
    id: 'basketball',
    label: 'Basketball',
    icon: Volleyball,
    className: 'bg-fuchsia-600 text-white',
  },
]

const presetById = new Map(
  CLIENT_AVATAR_PRESETS.map((preset) => [preset.id, preset])
)

export function clientAvatarPresetUrl(id: ClientAvatarPresetId): string {
  return `${PRESET_PREFIX}${id}`
}

export function parseClientAvatarPreset(
  url: string | null | undefined
): ClientAvatarPresetId | null {
  if (!url?.startsWith(PRESET_PREFIX)) return null
  const id = url.slice(PRESET_PREFIX.length) as ClientAvatarPresetId
  return presetById.has(id) ? id : null
}

export function getClientAvatarPreset(
  id: string | null | undefined
): ClientAvatarPreset | null {
  if (!id) return null
  return presetById.get(id as ClientAvatarPresetId) ?? null
}

export function isClientAvatarPresetId(
  id: string
): id is ClientAvatarPresetId {
  return presetById.has(id as ClientAvatarPresetId)
}
