import {
  formatShoppingListGrams,
  formatShoppingListItemLabel,
} from '@/lib/shopping-purchase-estimates'
import type { MealPlanDayWithMeals, MealPlanMealFood } from 'app/types/database'

export type ShoppingListItem = {
  foodKey: string
  foodName: string
  quantityG: number
  source: MealPlanMealFood['source']
}

export const MIN_SHOPPING_LIST_CYCLES = 1
export const MAX_SHOPPING_LIST_CYCLES = 12

export function normalizeShoppingListCycles(cycles?: number | null): number {
  if (cycles == null || !Number.isFinite(cycles)) return MIN_SHOPPING_LIST_CYCLES
  return Math.min(
    MAX_SHOPPING_LIST_CYCLES,
    Math.max(MIN_SHOPPING_LIST_CYCLES, Math.round(cycles))
  )
}

export function shoppingListFoodKey(name: string) {
  return name.trim().toLowerCase()
}

function roundQuantity(value: number) {
  return Math.round(value * 10) / 10
}

export function generateShoppingList(
  days: MealPlanDayWithMeals[],
  options?: { cycles?: number | null }
): ShoppingListItem[] {
  const cycles = normalizeShoppingListCycles(options?.cycles)
  const totals = new Map<
    string,
    {
      foodKey: string
      foodName: string
      quantityG: number
      source: MealPlanMealFood['source']
    }
  >()

  for (const day of days) {
    for (const meal of day.meals) {
      for (const food of meal.foods) {
        const key = shoppingListFoodKey(food.food_name)
        const existing = totals.get(key)

        if (existing) {
          existing.quantityG = roundQuantity(existing.quantityG + food.quantity_g)
        } else {
          totals.set(key, {
            foodKey: key,
            foodName: food.food_name.trim(),
            quantityG: food.quantity_g,
            source: food.source,
          })
        }
      }
    }
  }

  const items = Array.from(totals.values()).map((item) =>
    cycles === 1
      ? item
      : {
          ...item,
          quantityG: roundQuantity(item.quantityG * cycles),
        }
  )

  return items.sort((a, b) =>
    a.foodName.localeCompare(b.foodName, undefined, { sensitivity: 'base' })
  )
}

export function formatShoppingListQuantity(
  foodName: string,
  quantityG: number
): string {
  return formatShoppingListItemLabel(foodName, quantityG).label
}

export { formatShoppingListGrams, formatShoppingListItemLabel }

export function formatShoppingListCoverageLabel(
  dayCount: number,
  cycles?: number | null
): string | null {
  if (dayCount <= 0) return null
  const normalizedCycles = normalizeShoppingListCycles(cycles)
  if (normalizedCycles <= 1) return `Full ${dayCount}-day plan`
  return `Full ${dayCount}-day plan × ${normalizedCycles} cycles`
}

export function formatShoppingListText(
  items: ShoppingListItem[],
  options?: { planName?: string; dayCount?: number; cycles?: number | null }
): string {
  const lines: string[] = []

  if (options?.planName) {
    lines.push(`Shopping list — ${options.planName}`)
  } else {
    lines.push('Shopping list')
  }

  const coverage = formatShoppingListCoverageLabel(
    options?.dayCount ?? 0,
    options?.cycles
  )
  if (coverage) {
    lines.push(coverage)
  }

  lines.push('')

  if (items.length === 0) {
    lines.push('No ingredients yet.')
    return lines.join('\n')
  }

  for (const item of items) {
    lines.push(
      `- ${item.foodName} — ${formatShoppingListQuantity(item.foodName, item.quantityG)}`
    )
  }

  return lines.join('\n')
}
