export const DIETARY_RESTRICTION_PRESETS = [
  'Gluten-free',
  'Dairy-free',
  'Nut allergy',
  'Vegan',
  'Vegetarian',
  'Halal',
  'Kosher',
] as const

export type DietaryRestrictionPreset = (typeof DIETARY_RESTRICTION_PRESETS)[number]

const PRESET_LOOKUP = new Map(
  DIETARY_RESTRICTION_PRESETS.map((preset) => [preset.toLowerCase(), preset])
)

function normalizeToken(token: string): string {
  return token.trim().replace(/\s+/g, ' ')
}

export function parseDietaryRestrictions(
  value: string | null | undefined
): { presets: DietaryRestrictionPreset[]; custom: string[] } {
  if (!value?.trim()) {
    return { presets: [], custom: [] }
  }

  const presets: DietaryRestrictionPreset[] = []
  const custom: string[] = []

  for (const raw of value.split(',')) {
    const token = normalizeToken(raw)
    if (!token) continue

    const preset = PRESET_LOOKUP.get(token.toLowerCase())
    if (preset) {
      if (!presets.includes(preset)) presets.push(preset)
    } else if (!custom.some((entry) => entry.toLowerCase() === token.toLowerCase())) {
      custom.push(token)
    }
  }

  return { presets, custom }
}

export function serializeDietaryRestrictions(
  presets: DietaryRestrictionPreset[],
  custom: string[]
): string | null {
  const tokens = [
    ...presets,
    ...custom.map(normalizeToken).filter(Boolean),
  ].filter((token, index, list) => {
    const lower = token.toLowerCase()
    return list.findIndex((entry) => entry.toLowerCase() === lower) === index
  })

  return tokens.length > 0 ? tokens.join(', ') : null
}

export function formatDietaryRestrictionsList(
  value: string | null | undefined
): string[] {
  const { presets, custom } = parseDietaryRestrictions(value)
  return [...presets, ...custom]
}
