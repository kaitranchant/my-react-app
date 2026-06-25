'use client'

import * as React from 'react'
import { Loader2, Plus, Search } from 'lucide-react'

import { searchFoodCatalog } from '@/app/(dashboard)/library/foods/catalog-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  buildFoodSelectionSnapshot,
  formatFoodMacrosShort,
  type FoodCatalogSearchResult,
  type FoodSelectionSnapshot,
} from '@/lib/food-catalog'

type FoodSearchPickerProps = {
  onAdd: (snapshot: FoodSelectionSnapshot) => void
  addLabel?: string
  defaultQuantityG?: number
  showManualEntry?: boolean
  onManualEntry?: () => void
  disabled?: boolean
}

export function FoodSearchPicker({
  onAdd,
  addLabel = 'Add food',
  defaultQuantityG = 100,
  showManualEntry = false,
  onManualEntry,
  disabled = false,
}: FoodSearchPickerProps) {
  const [query, setQuery] = React.useState('')
  const [quantityG, setQuantityG] = React.useState(String(defaultQuantityG))
  const [results, setResults] = React.useState<FoodCatalogSearchResult[]>([])
  const [selected, setSelected] = React.useState<FoodCatalogSearchResult | null>(
    null
  )
  const [searching, setSearching] = React.useState(false)

  React.useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSelected(null)
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      setSearching(true)
      try {
        const nextResults = await searchFoodCatalog(trimmed)
        if (!cancelled) {
          setResults(nextResults)
          setSelected((current) =>
            current && nextResults.some((food) => food.id === current.id)
              ? current
              : (nextResults[0] ?? null)
          )
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [query])

  const parsedQuantity = Number(quantityG)
  const quantityIsValid = Number.isFinite(parsedQuantity) && parsedQuantity > 0
  const preview =
    selected && quantityIsValid
      ? buildFoodSelectionSnapshot(selected, parsedQuantity)
      : null

  function handleAdd() {
    if (!selected || !quantityIsValid) return
    onAdd(buildFoodSelectionSnapshot(selected, parsedQuantity))
    setQuery('')
    setResults([])
    setSelected(null)
    setQuantityG(String(defaultQuantityG))
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="food-search">Search foods</Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="food-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search USDA foods, e.g. chicken breast"
            className="pl-9"
            disabled={disabled}
          />
          {searching ? (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">
          Data from USDA FoodData Central. Quantities are in grams.
        </p>
      </div>

      {results.length > 0 ? (
        <div className="border-border max-h-48 overflow-y-auto rounded-lg border">
          <ul className="divide-border divide-y">
            {results.map((food) => {
              const isSelected = selected?.id === food.id
              return (
                <li key={food.id}>
                  <button
                    type="button"
                    className={`hover:bg-muted/50 w-full px-3 py-2 text-left ${
                      isSelected ? 'bg-muted/40' : ''
                    }`}
                    onClick={() => setSelected(food)}
                    disabled={disabled}
                  >
                    <p className="text-sm font-medium">{food.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {food.category} · per 100 g:{' '}
                      {formatFoodMacrosShort(food.per100g)}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : query.trim().length >= 2 && !searching ? (
        <p className="text-muted-foreground text-sm">No foods matched that search.</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="food-quantity">Quantity (g)</Label>
          <Input
            id="food-quantity"
            type="number"
            min="1"
            step="1"
            value={quantityG}
            onChange={(event) => setQuantityG(event.target.value)}
            disabled={disabled || !selected}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || !preview}
          onClick={handleAdd}
        >
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>

      {preview ? (
        <p className="text-muted-foreground text-xs">
          {preview.quantityG} g {preview.foodName}:{' '}
          {formatFoodMacrosShort(preview)}
        </p>
      ) : null}

      {showManualEntry && onManualEntry ? (
        <button
          type="button"
          className="text-primary text-left text-sm font-medium hover:underline"
          onClick={onManualEntry}
          disabled={disabled}
        >
          Enter food manually instead
        </button>
      ) : null}
    </div>
  )
}
