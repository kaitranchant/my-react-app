'use client'

import * as React from 'react'
import { Loader2, Plus, Search } from 'lucide-react'

import type { FoodCatalogSearchResponse } from '@/app/food-catalog-actions'
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
  idPrefix?: string
}

export function FoodSearchPicker({
  onAdd,
  addLabel = 'Add food',
  defaultQuantityG = 100,
  showManualEntry = false,
  onManualEntry,
  disabled = false,
  idPrefix: idPrefixProp,
}: FoodSearchPickerProps) {
  const generatedId = React.useId()
  const idPrefix = idPrefixProp ?? generatedId
  const searchId = `${idPrefix}-search`
  const quantityId = `${idPrefix}-quantity`
  const [query, setQuery] = React.useState('')
  const [quantityG, setQuantityG] = React.useState(String(defaultQuantityG))
  const [results, setResults] = React.useState<FoodCatalogSearchResult[]>([])
  const [selected, setSelected] = React.useState<FoodCatalogSearchResult | null>(
    null
  )
  const [searching, setSearching] = React.useState(false)
  const [catalogError, setCatalogError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSelected(null)
      setCatalogError(null)
      return
    }

    const abortController = new AbortController()
    const timeout = window.setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ q: trimmed, limit: '20' })
        const fetchResponse = await fetch(`/api/food-catalog/search?${params}`, {
          signal: abortController.signal,
        })
        if (abortController.signal.aborted) return

        const response = (await fetchResponse.json()) as FoodCatalogSearchResponse
        if (abortController.signal.aborted) return

        if (!response.ok) {
          setResults([])
          setSelected(null)
          setCatalogError(response.error)
          return
        }

        setCatalogError(null)
        setResults(response.results)
        setSelected((current) =>
          current && response.results.some((food) => food.id === current.id)
            ? current
            : (response.results[0] ?? null)
        )
      } catch {
        if (abortController.signal.aborted) return
        setResults([])
        setSelected(null)
        setCatalogError('Food search is temporarily unavailable.')
      } finally {
        if (!abortController.signal.aborted) setSearching(false)
      }
    }, 250)

    return () => {
      abortController.abort()
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
        <Label htmlFor={searchId}>Search foods</Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id={searchId}
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
        {catalogError ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 rounded-lg border px-3 py-2 text-sm"
          >
            <p className="text-destructive">{catalogError}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Run{' '}
              <code className="bg-muted rounded px-1 py-0.5">
                yarn workspace next-app sync:food-catalog
              </code>{' '}
              from the repo root to load USDA foods.
            </p>
          </div>
        ) : null}
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
                    role="option"
                    aria-selected={isSelected}
                    aria-label={`${food.name}, ${food.category}`}
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
      ) : query.trim().length >= 2 && !searching && !catalogError ? (
        <p className="text-muted-foreground text-sm">No foods matched that search.</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor={quantityId}>Quantity (g)</Label>
          <Input
            id={quantityId}
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
          {formatFoodMacrosShort({
            caloriesKcal: preview.caloriesKcal,
            proteinG: preview.proteinG,
            carbsG: preview.carbsG,
            fatG: preview.fatG,
            fiberG: preview.fiberG ?? undefined,
          })}
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
