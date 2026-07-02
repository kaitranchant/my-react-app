'use client'

import * as React from 'react'
import { ClipboardCopy, ShoppingCart } from 'lucide-react'
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
} from '@/lib/meal-plan-shopping-list'
import type {
  MealPlanAssignment,
  MealPlanDayWithMeals,
} from 'app/types/database'

type ShoppingListCardProps = {
  assignment: MealPlanAssignment | null
  days: MealPlanDayWithMeals[]
  planName?: string | null
  audience?: 'coach' | 'client'
}

export function ShoppingListCard({
  assignment,
  days,
  planName = null,
  audience = 'client',
}: ShoppingListCardProps) {
  const [copyPending, setCopyPending] = React.useState(false)
  const items = React.useMemo(() => generateShoppingList(days), [days])
  const dayCount = days.length

  async function handleCopy() {
    setCopyPending(true)
    try {
      const text = formatShoppingListText(items, {
        planName: planName ?? undefined,
        dayCount,
      })
      await navigator.clipboard.writeText(text)
      toast.success('Shopping list copied to clipboard.')
    } catch {
      toast.error('Could not copy the shopping list.')
    } finally {
      setCopyPending(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Shopping list</CardTitle>
          <CardDescription>
            {assignment
              ? dayCount > 0
                ? `Practical buy estimates for the full ${dayCount}-day plan cycle, with gram totals.`
                : 'Practical buy estimates from your assigned meal plan, with gram totals.'
              : audience === 'coach'
                ? 'Assign a meal plan to generate a shopping list.'
                : 'Your coach can share a shopping list when a meal plan is assigned.'}
          </CardDescription>
        </div>
        {assignment && items.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={copyPending}
            onClick={handleCopy}
          >
            <ClipboardCopy className="size-4" />
            {copyPending ? 'Copying…' : 'Copy list'}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
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

              return (
                <li
                  key={item.foodName}
                  className="flex items-start justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="font-medium">{item.foodName}</span>
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
