import {
  MEAL_LIBRARY_CARBS_RANGES,
  MEAL_LIBRARY_FAT_RANGES,
  MEAL_LIBRARY_PROTEIN_RANGES,
} from '@/lib/meal-library-filters'

import { MealLibraryMacroRangeFilter } from './meal-library-macro-filter'

export function MealLibraryProteinFilter() {
  return (
    <MealLibraryMacroRangeFilter
      param="protein"
      ranges={MEAL_LIBRARY_PROTEIN_RANGES}
      allLabel="All protein"
      placeholder="Protein"
    />
  )
}

export function MealLibraryCarbsFilter() {
  return (
    <MealLibraryMacroRangeFilter
      param="carbs"
      ranges={MEAL_LIBRARY_CARBS_RANGES}
      allLabel="All carbs"
      placeholder="Carbs"
    />
  )
}

export function MealLibraryFatFilter() {
  return (
    <MealLibraryMacroRangeFilter
      param="fat"
      ranges={MEAL_LIBRARY_FAT_RANGES}
      allLabel="All fat"
      placeholder="Fat"
    />
  )
}
