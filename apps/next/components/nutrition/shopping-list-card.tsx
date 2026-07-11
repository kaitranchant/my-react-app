'use client'

import * as React from 'react'
import {
  ClipboardCopy,
  Download,
  Minus,
  Plus,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  formatShoppingListItemLabel,
  formatShoppingListText,
  generateShoppingList,
  MAX_SHOPPING_LIST_CYCLES,
  MIN_SHOPPING_LIST_CYCLES,
  normalizeShoppingListCycles,
  shoppingListFoodKey,
} from '@/lib/meal-plan-shopping-list'
import { cn } from '@/lib/utils'
import type {
  MealPlanAssignment,
  MealPlanDayWithMeals,
} from 'app/types/database'

type ShoppingListCardProps = {
  assignment: MealPlanAssignment | null
  days: MealPlanDayWithMeals[]
  planName?: string | null
  audience?: 'coach' | 'client'
  checkedFoodKeys?: string[]
  onToggleChecked?: (
    foodKey: string,
    checked: boolean
  ) => Promise<{ success: boolean; error?: string }>
  onCyclesChange?: (
    cycles: number
  ) => Promise<{ success: boolean; error?: string }>
}

function shoppingListDescription(dayCount: number, cycles: number) {
  if (dayCount <= 0) {
    return 'Practical buy estimates from your assigned meal plan, with gram totals.'
  }
  if (cycles <= 1) {
    return `Practical buy estimates for the full ${dayCount}-day plan, with gram totals.`
  }
  return `Practical buy estimates for ${cycles}× the ${dayCount}-day plan (${dayCount * cycles} days of food), with gram totals.`
}

export function ShoppingListCard({
  assignment,
  days,
  planName = null,
  audience = 'client',
  checkedFoodKeys = [],
  onToggleChecked,
  onCyclesChange,
}: ShoppingListCardProps) {
  const [copyPending, setCopyPending] = React.useState(false)
  const [exportPending, setExportPending] = React.useState(false)
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(
    () => new Set()
  )
  const [optimisticChecked, setOptimisticChecked] = React.useState(
    () => new Set(checkedFoodKeys.map(shoppingListFoodKey))
  )
  const [cycles, setCycles] = React.useState(() =>
    normalizeShoppingListCycles(assignment?.shopping_list_cycles)
  )
  const cyclesSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const cyclesSaveRequestRef = React.useRef(0)
  const savedCyclesRef = React.useRef(
    normalizeShoppingListCycles(assignment?.shopping_list_cycles)
  )

  React.useEffect(() => {
    const next = normalizeShoppingListCycles(assignment?.shopping_list_cycles)
    savedCyclesRef.current = next
    setCycles(next)
  }, [assignment?.id, assignment?.shopping_list_cycles])

  React.useEffect(() => {
    return () => {
      if (cyclesSaveTimerRef.current) {
        clearTimeout(cyclesSaveTimerRef.current)
      }
    }
  }, [])

  const items = React.useMemo(() => {
    const generated = generateShoppingList(days, { cycles })
    return [...generated].sort((a, b) => {
      const aChecked = optimisticChecked.has(a.foodKey)
      const bChecked = optimisticChecked.has(b.foodKey)
      if (aChecked !== bChecked) return aChecked ? 1 : -1
      return a.foodName.localeCompare(b.foodName, undefined, {
        sensitivity: 'base',
      })
    })
  }, [cycles, days, optimisticChecked])
  const dayCount = days.length
  const canCheckOff = Boolean(assignment && onToggleChecked)
  const canChangeCycles = Boolean(assignment && onCyclesChange && dayCount > 0)

  React.useEffect(() => {
    setOptimisticChecked(new Set(checkedFoodKeys.map(shoppingListFoodKey)))
  }, [checkedFoodKeys])

  const checkedCount = items.filter((item) =>
    optimisticChecked.has(item.foodKey)
  ).length

  function handleCyclesChange(nextCycles: number) {
    if (!onCyclesChange || !assignment) return
    const normalized = normalizeShoppingListCycles(nextCycles)
    if (normalized === cycles) return

    setCycles(normalized)

    if (cyclesSaveTimerRef.current) {
      clearTimeout(cyclesSaveTimerRef.current)
    }

    const requestId = ++cyclesSaveRequestRef.current
    cyclesSaveTimerRef.current = setTimeout(() => {
      void (async () => {
        const result = await onCyclesChange(normalized)
        if (requestId !== cyclesSaveRequestRef.current) return

        if (!result.success) {
          setCycles(savedCyclesRef.current)
          toast.error(result.error ?? 'Could not update plan cycles.')
          return
        }

        savedCyclesRef.current = normalized
      })()
    }, 250)
  }

  async function handleCopy() {
    setCopyPending(true)
    try {
      const text = formatShoppingListText(items, {
        planName: planName ?? undefined,
        dayCount,
        cycles,
      })
      await navigator.clipboard.writeText(text)
      toast.success('Shopping list copied to clipboard.')
    } catch {
      toast.error('Could not copy the shopping list.')
    } finally {
      setCopyPending(false)
    }
  }

  function handleExport() {
    setExportPending(true)
    try {
      const text = formatShoppingListText(items, {
        planName: planName ?? undefined,
        dayCount,
        cycles,
      })
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const slug = (planName ?? 'shopping-list')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      link.href = url
      link.download = `${slug || 'shopping-list'}.txt`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Shopping list downloaded.')
    } catch {
      toast.error('Could not export the shopping list.')
    } finally {
      setExportPending(false)
    }
  }

  async function handleToggle(foodKey: string, nextChecked: boolean) {
    if (!onToggleChecked) return

    setOptimisticChecked((current) => {
      const next = new Set(current)
      if (nextChecked) next.add(foodKey)
      else next.delete(foodKey)
      return next
    })
    setPendingKeys((current) => new Set(current).add(foodKey))

    const result = await onToggleChecked(foodKey, nextChecked)

    setPendingKeys((current) => {
      const next = new Set(current)
      next.delete(foodKey)
      return next
    })

    if (!result.success) {
      setOptimisticChecked((current) => {
        const next = new Set(current)
        if (nextChecked) next.delete(foodKey)
        else next.add(foodKey)
        return next
      })
      toast.error(result.error ?? 'Could not update the shopping list.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Shopping list</CardTitle>
          <CardDescription>
            {assignment
              ? shoppingListDescription(dayCount, cycles)
              : audience === 'coach'
                ? 'Assign a meal plan to generate a shopping list.'
                : 'Your coach can share a shopping list when a meal plan is assigned.'}
            {assignment && items.length > 0 && canCheckOff
              ? ` ${checkedCount} of ${items.length} checked off.`
              : null}
          </CardDescription>
        </div>
        {assignment && items.length > 0 ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={copyPending}
              onClick={handleCopy}
            >
              <ClipboardCopy className="size-4" />
              {copyPending ? 'Copying…' : 'Copy'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportPending}
              onClick={handleExport}
            >
              <Download className="size-4" />
              {exportPending ? 'Exporting…' : 'Export'}
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        {canChangeCycles ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Plan cycles</p>
              <p className="text-muted-foreground text-xs">
                Buy for multiple runs of this plan without changing the days.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={cycles <= MIN_SHOPPING_LIST_CYCLES}
                onClick={() => handleCyclesChange(cycles - 1)}
                aria-label="Decrease plan cycles"
              >
                <Minus className="size-4" />
              </Button>
              <span className="min-w-8 text-center text-sm font-medium tabular-nums">
                {cycles}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={cycles >= MAX_SHOPPING_LIST_CYCLES}
                onClick={() => handleCyclesChange(cycles + 1)}
                aria-label="Increase plan cycles"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {!assignment ? (
          <EmptyState
            icon={ShoppingCart}
            title="No shopping list yet"
            description={
              audience === 'coach'
                ? 'Assign a meal plan with ingredients to build a shopping list for this client.'
                : 'When your coach assigns a meal plan, your shopping list will appear here.'
            }
            className="py-4"
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No ingredients yet"
            description={
              audience === 'coach'
                ? 'Add foods to meals in the plan builder to populate the shopping list.'
                : 'Your coach is still adding ingredients to your meal plan.'
            }
            className="py-4"
          />
        ) : (
          <ul className="divide-border divide-y">
            {items.map((item) => {
              const display = formatShoppingListItemLabel(
                item.foodName,
                item.quantityG
              )
              const checked = optimisticChecked.has(item.foodKey)
              const pending = pendingKeys.has(item.foodKey)

              return (
                <li
                  key={item.foodKey}
                  className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <label
                    className={cn(
                      'flex min-w-0 flex-1 items-start gap-3',
                      canCheckOff ? 'cursor-pointer' : null,
                      checked ? 'text-muted-foreground' : null
                    )}
                  >
                    {canCheckOff ? (
                      <input
                        type="checkbox"
                        className="border-input accent-primary mt-1 size-4 shrink-0 rounded"
                        checked={checked}
                        disabled={pending}
                        onChange={(event) =>
                          void handleToggle(item.foodKey, event.target.checked)
                        }
                        aria-label={`Mark ${item.foodName} as purchased`}
                      />
                    ) : null}
                    <span
                      className={cn(
                        'font-medium',
                        checked ? 'line-through' : null
                      )}
                    >
                      {item.foodName}
                    </span>
                  </label>
                  <span className="shrink-0 text-right text-sm">
                    {display.purchase ? (
                      <>
                        <span className="font-medium">{display.purchase}</span>
                        <span className="text-muted-foreground block text-xs tabular-nums">
                          {display.grams}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground tabular-nums">
                        {display.grams}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
