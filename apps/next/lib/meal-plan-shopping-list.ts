import type { MealPlanDayWithMeals, MealPlanMealFood } from 'app/types/database'

export type ShoppingListItem = {
  foodName: string
  quantityG: number
  source: MealPlanMealFood['source']
}

function normalizeFoodKey(name: string) {
  return name.trim().toLowerCase()
}

function roundQuantity(value: number) {
  return Math.round(value * 10) / 10
}

export function generateShoppingList(
  days: MealPlanDayWithMeals[]
): ShoppingListItem[] {
  const totals = new Map<
    string,
    { foodName: string; quantityG: number; source: MealPlanMealFood['source'] }
  >()

  for (const day of days) {
    for (const meal of day.meals) {
      for (const food of meal.foods) {
        const key = normalizeFoodKey(food.food_name)
        const existing = totals.get(key)

        if (existing) {
          existing.quantityG = roundQuantity(existing.quantityG + food.quantity_g)
        } else {
          totals.set(key, {
            foodName: food.food_name.trim(),
            quantityG: food.quantity_g,
            source: food.source,
          })
        }
      }
    }
  }

  return Array.from(totals.values()).sort((a, b) =>
    a.foodName.localeCompare(b.foodName, undefined, { sensitivity: 'base' })
  )
}

export function formatShoppingListQuantity(quantityG: number): string {
  if (quantityG >= 1000) {
    const kg = roundQuantity(quantityG / 1000)
    return `${kg} kg`
  }

  return `${roundQuantity(quantityG)} g`
}

export function formatShoppingListText(
  items: ShoppingListItem[],
  options?: { planName?: string; dayCount?: number }
): string {
  const lines: string[] = []

  if (options?.planName) {
    lines.push(`Shopping list — ${options.planName}`)
  } else {
    lines.push('Shopping list')
  }

  if (options?.dayCount && options.dayCount > 0) {
    lines.push(`Full ${options.dayCount}-day plan cycle`)
  }

  lines.push('')

  if (items.length === 0) {
    lines.push('No ingredients yet.')
    return lines.join('\n')
  }

  for (const item of items) {
    lines.push(
      `- ${item.foodName} — ${formatShoppingListQuantity(item.quantityG)}`
    )
  }

  return lines.join('\n')
}
