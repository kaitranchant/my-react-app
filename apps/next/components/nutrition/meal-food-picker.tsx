'use client'

import * as React from 'react'

import { FoodSearchPicker } from '@/components/nutrition/food-search-picker'
import { ManualFoodEntryForm } from '@/components/nutrition/manual-food-entry-form'
import {
  buildCustomFoodSnapshot,
  type FoodSelectionSnapshot,
} from '@/lib/food-catalog'

type MealFoodPickerProps = {
  idPrefix: string
  disabled: boolean
  addLabel?: string
  onAdd: (snapshot: FoodSelectionSnapshot) => void
}

export function MealFoodPicker({
  idPrefix,
  disabled,
  addLabel = 'Add food',
  onAdd,
}: MealFoodPickerProps) {
  const [manualMode, setManualMode] = React.useState(false)

  if (manualMode) {
    return (
      <ManualFoodEntryForm
        showQuantity
        idPrefix={`${idPrefix}-manual`}
        disabled={disabled}
        submitLabel={addLabel}
        onBack={() => setManualMode(false)}
        onSubmit={(values) => {
          if (!values.quantityG) return
          onAdd(
            buildCustomFoodSnapshot({
              foodName: values.foodName,
              quantityG: values.quantityG,
              caloriesKcal: values.caloriesKcal,
              proteinG: values.proteinG,
              carbsG: values.carbsG,
              fatG: values.fatG,
            })
          )
          setManualMode(false)
        }}
      />
    )
  }

  return (
    <FoodSearchPicker
      idPrefix={idPrefix}
      disabled={disabled}
      addLabel={addLabel}
      showManualEntry
      onManualEntry={() => setManualMode(true)}
      onAdd={onAdd}
    />
  )
}
