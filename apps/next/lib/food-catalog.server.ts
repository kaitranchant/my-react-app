import 'server-only'

import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  searchFoodCatalogRecords,
  type FoodCatalogRecord,
  type FoodCatalogSearchResult,
} from '@/lib/food-catalog'

export type { FoodCatalogRecord, FoodCatalogSearchResult } from '@/lib/food-catalog'

export class FoodCatalogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FoodCatalogError'
  }
}

const CATALOG_JSON_PATH = path.join(process.cwd(), 'data', 'foods.json')
const DEFAULT_SEARCH_LIMIT = 20

let catalogCache: FoodCatalogRecord[] | null = null

function loadCatalog(): FoodCatalogRecord[] {
  if (catalogCache) return catalogCache

  try {
    catalogCache = JSON.parse(
      readFileSync(CATALOG_JSON_PATH, 'utf8')
    ) as FoodCatalogRecord[]
  } catch {
    throw new FoodCatalogError(
      'Food catalog data is missing. Run yarn workspace next-app sync:food-catalog.'
    )
  }

  return catalogCache
}

export function isFoodCatalogConfigured() {
  try {
    loadCatalog()
    return true
  } catch {
    return false
  }
}

export function getFoodCatalogCount() {
  return loadCatalog().length
}

export function getFoodById(id: string) {
  return loadCatalog().find((food) => food.id === id) ?? null
}

export function searchFoodCatalog(query: string, limit = DEFAULT_SEARCH_LIMIT) {
  return searchFoodCatalogRecords(loadCatalog(), query, limit)
}

export function listFoodCategories() {
  const categories = new Set(loadCatalog().map((food) => food.category))
  return Array.from(categories).sort((left, right) => left.localeCompare(right))
}
