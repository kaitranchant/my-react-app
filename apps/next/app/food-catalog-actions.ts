'use server'

import {
  FoodCatalogError,
  searchFoodCatalog as searchCatalog,
} from '@/lib/food-catalog.server'

export type FoodCatalogSearchResponse =
  | { ok: true; results: Awaited<ReturnType<typeof searchCatalog>> }
  | { ok: false; error: string }

export async function searchFoodCatalog(
  query: string,
  limit = 20
): Promise<FoodCatalogSearchResponse> {
  try {
    return { ok: true, results: searchCatalog(query, limit) }
  } catch (error) {
    if (error instanceof FoodCatalogError) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'Food search is temporarily unavailable.' }
  }
}
