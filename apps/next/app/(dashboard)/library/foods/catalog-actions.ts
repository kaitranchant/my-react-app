'use server'

import { searchFoodCatalog as searchCatalog } from '@/lib/food-catalog.server'

export async function searchFoodCatalog(query: string, limit = 20) {
  return searchCatalog(query, limit)
}
