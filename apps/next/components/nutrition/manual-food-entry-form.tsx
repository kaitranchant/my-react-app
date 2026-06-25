'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type ManualFoodEntryValues = {
  foodName: string
  quantityG: number | null
  caloriesKcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  fiberG: number | null
}

type ManualFoodEntryFormProps = {
  onSubmit: (values: ManualFoodEntryValues) => void
  onBack?: () => void
  submitLabel?: string
  disabled?: boolean
  showQuantity?: boolean
  showFiber?: boolean
  defaultQuantityG?: number
  idPrefix?: string
}

export function ManualFoodEntryForm({
  onSubmit,
  onBack,
  submitLabel = 'Add food',
  disabled = false,
  showQuantity = false,
  showFiber = false,
  defaultQuantityG = 100,
  idPrefix: idPrefixProp,
}: ManualFoodEntryFormProps) {
  const generatedId = React.useId()
  const idPrefix = idPrefixProp ?? generatedId
  const [foodName, setFoodName] = React.useState('')
  const [quantityG, setQuantityG] = React.useState(String(defaultQuantityG))
  const [caloriesKcal, setCaloriesKcal] = React.useState('')
  const [proteinG, setProteinG] = React.useState('')
  const [carbsG, setCarbsG] = React.useState('')
  const [fatG, setFatG] = React.useState('')
  const [fiberG, setFiberG] = React.useState('')

  function parseOptionalNumber(value: string) {
    return value === '' ? null : Number(value)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!foodName.trim()) return

    const parsedQuantity = Number(quantityG)
    if (showQuantity && (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0)) {
      return
    }

    onSubmit({
      foodName: foodName.trim(),
      quantityG: showQuantity ? parsedQuantity : null,
      caloriesKcal: parseOptionalNumber(caloriesKcal),
      proteinG: parseOptionalNumber(proteinG),
      carbsG: parseOptionalNumber(carbsG),
      fatG: parseOptionalNumber(fatG),
      fiberG: showFiber ? parseOptionalNumber(fiberG) : null,
    })

    setFoodName('')
    setQuantityG(String(defaultQuantityG))
    setCaloriesKcal('')
    setProteinG('')
    setCarbsG('')
    setFatG('')
    setFiberG('')
  }

  const macroFields = (
    [
      ['caloriesKcal', 'Calories', caloriesKcal, setCaloriesKcal],
      ['proteinG', 'Protein (g)', proteinG, setProteinG],
      ['carbsG', 'Carbs (g)', carbsG, setCarbsG],
      ['fatG', 'Fat (g)', fatG, setFatG],
      ...(showFiber
        ? [['fiberG', 'Fiber (g)', fiberG, setFiberG] as const]
        : []),
    ] as const
  )

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Food</Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="e.g. Homemade smoothie"
          value={foodName}
          onChange={(event) => setFoodName(event.target.value)}
          disabled={disabled}
          required
        />
      </div>
      {showQuantity ? (
        <div className="grid gap-1.5 sm:max-w-xs">
          <Label htmlFor={`${idPrefix}-quantity`}>Quantity (g)</Label>
          <Input
            id={`${idPrefix}-quantity`}
            type="number"
            min="1"
            step="1"
            value={quantityG}
            onChange={(event) => setQuantityG(event.target.value)}
            disabled={disabled}
            required
          />
        </div>
      ) : null}
      <div
        className={`grid gap-3 ${showFiber ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}
      >
        {macroFields.map(([field, label, value, setValue]) => (
          <div key={field} className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-${field}`}>{label}</Label>
            <Input
              id={`${idPrefix}-${field}`}
              type="number"
              min="0"
              step="0.1"
              placeholder="—"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        {onBack ? (
          <Button type="button" variant="ghost" size="sm" onClick={onBack} disabled={disabled}>
            Back to search
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={disabled}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
