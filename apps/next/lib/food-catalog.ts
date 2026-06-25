export type FoodMacros = {
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number
}

export type FoodCatalogRecord = {
  id: string
  name: string
  category: string
  source: 'usda'
  per100g: FoodMacros
}

export type FoodCatalogSearchResult = FoodCatalogRecord

export type FoodSelectionSnapshot = {
  source: 'usda' | 'custom'
  externalId: string | null
  foodName: string
  quantityG: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG?: number | null
}

export function scaleFoodMacros(per100g: FoodMacros, quantityG: number): FoodMacros {
  const factor = quantityG / 100
  const scaled: FoodMacros = {
    caloriesKcal: roundMacro(per100g.caloriesKcal * factor),
    proteinG: roundMacro(per100g.proteinG * factor),
    carbsG: roundMacro(per100g.carbsG * factor),
    fatG: roundMacro(per100g.fatG * factor),
  }
  if (per100g.fiberG != null) {
    scaled.fiberG = roundMacro(per100g.fiberG * factor)
  }
  return scaled
}

export function buildCustomFoodSnapshot(values: {
  foodName: string
  quantityG: number
  caloriesKcal?: number | null
  proteinG?: number | null
  carbsG?: number | null
  fatG?: number | null
  fiberG?: number | null
}): FoodSelectionSnapshot {
  return {
    source: 'custom',
    externalId: null,
    foodName: values.foodName.trim(),
    quantityG: values.quantityG,
    caloriesKcal: values.caloriesKcal ?? 0,
    proteinG: values.proteinG ?? 0,
    carbsG: values.carbsG ?? 0,
    fatG: values.fatG ?? 0,
    fiberG: values.fiberG ?? null,
  }
}

export function buildFoodSelectionSnapshot(
  food: Pick<FoodCatalogRecord, 'id' | 'name' | 'source' | 'per100g'>,
  quantityG: number
): FoodSelectionSnapshot {
  const scaled = scaleFoodMacros(food.per100g, quantityG)
  return {
    source: food.source,
    externalId: food.id,
    foodName: food.name,
    quantityG,
    ...scaled,
  }
}

export function formatFoodMacrosShort(macros: FoodMacros) {
  const base = `${macros.caloriesKcal} kcal · ${macros.proteinG} P · ${macros.fatG} F · ${macros.carbsG} C`
  if (macros.fiberG != null && macros.fiberG > 0) {
    return `${base} · ${macros.fiberG} fiber`
  }
  return base
}

export function formatFoodQuantityLabel(quantityG: number, foodName: string) {
  return `${quantityG} g ${foodName}`
}

function roundMacro(value: number) {
  return Math.round(value * 10) / 10
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase()
}

function scoreFood(food: FoodCatalogRecord, tokens: string[]) {
  const haystack = `${food.name} ${food.category}`.toLowerCase()
  let score = 0

  for (const token of tokens) {
    if (!haystack.includes(token)) return -1
    if (food.name.toLowerCase().startsWith(token)) score += 4
    else if (food.name.toLowerCase().includes(token)) score += 2
    else score += 1
  }

  return score
}

export function searchFoodCatalogRecords(
  catalog: FoodCatalogRecord[],
  query: string,
  limit = 20
) {
  const normalized = normalizeQuery(query)
  if (!normalized) return []

  const tokens = normalized.split(/\s+/).filter(Boolean)

  return catalog
    .map((food) => ({ food, score: scoreFood(food, tokens) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return left.food.name.localeCompare(right.food.name)
    })
    .slice(0, limit)
    .map((entry) => entry.food)
}
