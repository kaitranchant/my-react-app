import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Apple,
  Backpack,
  Bike,
  BicepsFlexed,
  Bird,
  Cat,
  CirclePower,
  Compass,
  Dog,
  Dumbbell,
  Fish,
  FishingRod,
  Flame,
  Footprints,
  GlassWater,
  Goal,
  HeartPulse,
  Kayak,
  Medal,
  Mountain,
  Panda,
  PawPrint,
  PersonStanding,
  Rabbit,
  Sailboat,
  Salad,
  Snail,
  Snowflake,
  SportShoe,
  Squirrel,
  StretchVertical,
  Target,
  Tent,
  Timer,
  TrainTrack,
  Trophy,
  Turtle,
  Volleyball,
  Waves,
  Weight,
  Zap,
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
  | 'dog'
  | 'cat'
  | 'fish'
  | 'bird'
  | 'rabbit'
  | 'turtle'
  | 'panda'
  | 'squirrel'
  | 'paw'
  | 'snail'
  | 'goal'
  | 'kayak'
  | 'sailing'
  | 'medal'
  | 'snow'
  | 'track'
  | 'fishing'
  | 'activity'
  | 'footprints'
  | 'standing'
  | 'weight'
  | 'timer'
  | 'zap'
  | 'stretch'
  | 'power'
  | 'apple'
  | 'salad'
  | 'water'
  | 'tent'
  | 'backpack'
  | 'compass'
  | 'waves'

export type ClientAvatarPreset = {
  id: ClientAvatarPresetId
  label: string
  icon: LucideIcon
  className: string
}

const PRESET_PREFIX = 'preset:'

export const CLIENT_AVATAR_PRESETS: ClientAvatarPreset[] = [
  // Fitness & training
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
  {
    id: 'activity',
    label: 'Activity',
    icon: Activity,
    className: 'bg-rose-500 text-white',
  },
  {
    id: 'footprints',
    label: 'Steps',
    icon: Footprints,
    className: 'bg-stone-700 text-white',
  },
  {
    id: 'standing',
    label: 'Mobility',
    icon: PersonStanding,
    className: 'bg-purple-500 text-white',
  },
  {
    id: 'weight',
    label: 'Weight training',
    icon: Weight,
    className: 'bg-slate-800 text-white',
  },
  {
    id: 'timer',
    label: 'Timed workout',
    icon: Timer,
    className: 'bg-orange-600 text-white',
  },
  {
    id: 'zap',
    label: 'Energy',
    icon: Zap,
    className: 'bg-yellow-500 text-white',
  },
  {
    id: 'stretch',
    label: 'Stretching',
    icon: StretchVertical,
    className: 'bg-pink-600 text-white',
  },
  {
    id: 'power',
    label: 'Power',
    icon: CirclePower,
    className: 'bg-red-500 text-white',
  },
  // Sports
  {
    id: 'goal',
    label: 'Soccer',
    icon: Goal,
    className: 'bg-green-600 text-white',
  },
  {
    id: 'kayak',
    label: 'Kayaking',
    icon: Kayak,
    className: 'bg-blue-600 text-white',
  },
  {
    id: 'sailing',
    label: 'Sailing',
    icon: Sailboat,
    className: 'bg-sky-700 text-white',
  },
  {
    id: 'medal',
    label: 'Medal',
    icon: Medal,
    className: 'bg-yellow-600 text-white',
  },
  {
    id: 'snow',
    label: 'Winter sports',
    icon: Snowflake,
    className: 'bg-blue-400 text-white',
  },
  {
    id: 'track',
    label: 'Track',
    icon: TrainTrack,
    className: 'bg-red-600 text-white',
  },
  {
    id: 'fishing',
    label: 'Fishing',
    icon: FishingRod,
    className: 'bg-cyan-700 text-white',
  },
  // Animals
  {
    id: 'dog',
    label: 'Dog',
    icon: Dog,
    className: 'bg-amber-700 text-white',
  },
  {
    id: 'cat',
    label: 'Cat',
    icon: Cat,
    className: 'bg-stone-600 text-white',
  },
  {
    id: 'fish',
    label: 'Fish',
    icon: Fish,
    className: 'bg-cyan-600 text-white',
  },
  {
    id: 'bird',
    label: 'Bird',
    icon: Bird,
    className: 'bg-sky-500 text-white',
  },
  {
    id: 'rabbit',
    label: 'Rabbit',
    icon: Rabbit,
    className: 'bg-pink-400 text-white',
  },
  {
    id: 'turtle',
    label: 'Turtle',
    icon: Turtle,
    className: 'bg-green-700 text-white',
  },
  {
    id: 'panda',
    label: 'Panda',
    icon: Panda,
    className: 'bg-zinc-800 text-white',
  },
  {
    id: 'squirrel',
    label: 'Squirrel',
    icon: Squirrel,
    className: 'bg-orange-700 text-white',
  },
  {
    id: 'paw',
    label: 'Paw print',
    icon: PawPrint,
    className: 'bg-red-700 text-white',
  },
  {
    id: 'snail',
    label: 'Snail',
    icon: Snail,
    className: 'bg-lime-700 text-white',
  },
  // Nutrition & recovery
  {
    id: 'apple',
    label: 'Nutrition',
    icon: Apple,
    className: 'bg-red-500 text-white',
  },
  {
    id: 'salad',
    label: 'Healthy eating',
    icon: Salad,
    className: 'bg-lime-600 text-white',
  },
  {
    id: 'water',
    label: 'Hydration',
    icon: GlassWater,
    className: 'bg-cyan-500 text-white',
  },
  // Outdoor & adventure
  {
    id: 'tent',
    label: 'Camping',
    icon: Tent,
    className: 'bg-green-600 text-white',
  },
  {
    id: 'backpack',
    label: 'Hiking',
    icon: Backpack,
    className: 'bg-amber-800 text-white',
  },
  {
    id: 'compass',
    label: 'Adventure',
    icon: Compass,
    className: 'bg-emerald-700 text-white',
  },
  {
    id: 'waves',
    label: 'Swimming',
    icon: Waves,
    className: 'bg-blue-500 text-white',
  },
]

export const CLIENT_AVATAR_QUICK_PRESETS = CLIENT_AVATAR_PRESETS.slice(0, 10)

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
