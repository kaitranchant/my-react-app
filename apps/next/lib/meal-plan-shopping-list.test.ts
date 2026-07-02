import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatShoppingListQuantity,
  formatShoppingListText,
  generateShoppingList,
} from './meal-plan-shopping-list'
import type { MealPlanDayWithMeals } from 'app/types/database'

function makeDay(
  dayOffset: number,
  foods: Array<{ name: string; quantityG: number }>
): MealPlanDayWithMeals {
  return {
    id: `day-${dayOffset}`,
    meal_plan_id: 'plan-1',
    day_offset: dayOffset,
    label: null,
    notes: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
    meals: [
      {
        id: `meal-${dayOffset}`,
        meal_plan_day_id: `day-${dayOffset}`,
        sort_order: 0,
        meal_type: 'breakfast',
        name: 'Breakfast',
        description: null,
        calories_kcal: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
        foods: foods.map((food, index) => ({
          id: `food-${dayOffset}-${index}`,
          meal_plan_meal_id: `meal-${dayOffset}`,
          sort_order: index,
          food_name: food.name,
          source: 'custom' as const,
          external_id: null,
          quantity_g: food.quantityG,
          calories_kcal: null,
          protein_g: null,
          carbs_g: null,
          fat_g: null,
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-01T00:00:00Z',
        })),
      },
    ],
  }
}

test('generateShoppingList aggregates duplicate foods across days', () => {
  const items = generateShoppingList([
    makeDay(0, [
      { name: 'Chicken breast', quantityG: 150 },
      { name: 'Rice', quantityG: 100 },
    ]),
    makeDay(1, [
      { name: 'chicken breast', quantityG: 200 },
      { name: 'Broccoli', quantityG: 80 },
    ]),
  ])

  assert.equal(items.length, 3)
  assert.deepEqual(
    items.map((item) => [item.foodName, item.quantityG]),
    [
      ['Broccoli', 80],
      ['Chicken breast', 350],
      ['Rice', 100],
    ]
  )
})

test('formatShoppingListQuantity uses kg for large amounts', () => {
  assert.equal(formatShoppingListQuantity('Flour', 500), '500 g')
  assert.equal(formatShoppingListQuantity('Flour', 1500), '1.5 kg')
})

test('formatShoppingListQuantity includes purchase estimates when available', () => {
  assert.equal(
    formatShoppingListQuantity('Yogurt, Greek, nonfat, plain, CHOBANI', 227),
    '1 tub (227 g)'
  )
})

test('formatShoppingListText builds a copy-friendly list', () => {
  const text = formatShoppingListText(
    [
      { foodName: 'Eggs', quantityG: 120, source: 'custom' },
      { foodName: 'Oats', quantityG: 80, source: 'usda' },
    ],
    { planName: 'Lean bulk', dayCount: 7 }
  )

  assert.match(text, /Shopping list — Lean bulk/)
  assert.match(text, /Full 7-day plan cycle/)
  assert.match(text, /- Eggs — 3 eggs \(120 g\)/)
  assert.match(text, /- Oats — ~1 cup dry oats \(80 g\)/)
})
