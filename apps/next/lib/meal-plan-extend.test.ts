import assert from 'node:assert/strict'
import test from 'node:test'

import type { MealPlanDayWithMeals } from 'app/types/database'

import { appendDuplicatedMealPlanDays } from './meal-plan-extend'

function createMockSupabase() {
  const inserts: { table: string; rows: Record<string, unknown>[] }[] = []

  const supabase = {
    from(table: string) {
      let pendingRows: Record<string, unknown>[] = []

      return {
        insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
          pendingRows = Array.isArray(rows) ? rows : [rows]
          return {
            select() {
              return {
                async single() {
                  inserts.push({ table, rows: pendingRows })
                  const row = pendingRows[0]!
                  return {
                    data: { id: `${table}-${inserts.length}` },
                    error: null,
                  }
                },
              }
            },
            then(
              resolve: (value: { error: null }) => void,
              reject?: (reason: unknown) => void
            ) {
              inserts.push({ table, rows: pendingRows })
              return Promise.resolve({ error: null }).then(resolve, reject)
            },
          }
        },
      }
    },
  }

  return { supabase: supabase as never, inserts }
}

const sampleDays: MealPlanDayWithMeals[] = [
  {
    id: 'day-1',
    meal_plan_id: 'plan-1',
    day_offset: 0,
    label: 'Day 1',
    notes: null,
    created_at: '',
    updated_at: '',
    meals: [
      {
        id: 'meal-1',
        meal_plan_day_id: 'day-1',
        meal_type: 'breakfast',
        name: 'Oatmeal',
        description: null,
        calories_kcal: 300,
        protein_g: 10,
        carbs_g: 50,
        fat_g: 5,
        sort_order: 0,
        created_at: '',
        updated_at: '',
        foods: [
          {
            id: 'food-1',
            meal_plan_meal_id: 'meal-1',
            sort_order: 0,
            food_name: 'Oats',
            source: 'usda',
            external_id: '123',
            quantity_g: 80,
            calories_kcal: 300,
            protein_g: 10,
            carbs_g: 50,
            fat_g: 5,
            created_at: '',
            updated_at: '',
          },
        ],
      },
    ],
  },
  {
    id: 'day-2',
    meal_plan_id: 'plan-1',
    day_offset: 1,
    label: null,
    notes: null,
    created_at: '',
    updated_at: '',
    meals: [],
  },
]

test('appendDuplicatedMealPlanDays duplicates days at continuing offsets', async () => {
  const { supabase, inserts } = createMockSupabase()

  const result = await appendDuplicatedMealPlanDays(
    supabase,
    'plan-1',
    sampleDays
  )

  assert.equal(result.success, true)
  if (!result.success) return
  assert.equal(result.daysAdded, 2)

  const dayInserts = inserts.filter((entry) => entry.table === 'meal_plan_days')
  assert.equal(dayInserts.length, 2)
  assert.deepEqual(
    dayInserts.map((entry) => entry.rows[0]?.day_offset),
    [2, 3]
  )
})

test('appendDuplicatedMealPlanDays returns error when plan has no days', async () => {
  const { supabase } = createMockSupabase()

  const result = await appendDuplicatedMealPlanDays(supabase, 'plan-1', [])

  assert.equal(result.success, false)
  if (result.success) return
  assert.match(result.error, /no days/i)
})
