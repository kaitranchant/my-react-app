import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildFoodSelectionSnapshot,
  scaleFoodMacros,
  searchFoodCatalogRecords,
  type FoodCatalogRecord,
} from './food-catalog'

test('scaleFoodMacros scales per-100g values by quantity', () => {
  const scaled = scaleFoodMacros(
    {
      caloriesKcal: 100,
      proteinG: 20,
      carbsG: 10,
      fatG: 5,
    },
    150
  )

  assert.equal(scaled.caloriesKcal, 150)
  assert.equal(scaled.proteinG, 30)
  assert.equal(scaled.carbsG, 15)
  assert.equal(scaled.fatG, 7.5)
})

test('buildFoodSelectionSnapshot returns scaled diary/meal payload', () => {
  const snapshot = buildFoodSelectionSnapshot(
    {
      id: '123',
      name: 'Chicken, breast, raw',
      category: 'Poultry Products',
      source: 'usda',
      per100g: {
        caloriesKcal: 120,
        proteinG: 22.5,
        carbsG: 0,
        fatG: 2.6,
      },
    },
    200
  )

  assert.equal(snapshot.externalId, '123')
  assert.equal(snapshot.quantityG, 200)
  assert.equal(snapshot.caloriesKcal, 240)
  assert.equal(snapshot.proteinG, 45)
})

test('searchFoodCatalogRecords ranks prefix matches ahead of partial matches', () => {
  const catalog: FoodCatalogRecord[] = [
    {
      id: '1',
      name: 'Bread, whole wheat',
      category: 'Baked Products',
      source: 'usda',
      per100g: { caloriesKcal: 250, proteinG: 10, carbsG: 40, fatG: 4 },
    },
    {
      id: '2',
      name: 'Chicken, breast, raw',
      category: 'Poultry Products',
      source: 'usda',
      per100g: { caloriesKcal: 120, proteinG: 22.5, carbsG: 0, fatG: 2.6 },
    },
  ]

  const results = searchFoodCatalogRecords(catalog, 'chicken breast', 5)
  assert.equal(results[0]?.id, '2')
})
