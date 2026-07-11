'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  toggleClientShoppingListCheck,
  updateClientShoppingListCycles,
} from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { ClientNutritionSetupPanel } from '@/components/nutrition/client-nutrition-setup-panel'
import { ClientNutritionTrackingPanel } from '@/components/nutrition/client-nutrition-tracking-panel'
import { ShoppingListCard } from '@/components/nutrition/shopping-list-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  BiologicalSex,
  Client,
  ClientFoodDiaryEntry,
  ClientGoal,
  ClientInbodyScan,
  ClientNutritionLog,
  ClientNutritionProfile,
  MealPlan,
  MealPlanAssignmentWithPlan,
  MealPlanDayWithMeals,
} from 'app/types/database'

const NUTRITION_SECTIONS = ['tracking', 'setup', 'shopping'] as const
export type NutritionSection = (typeof NUTRITION_SECTIONS)[number]

export function resolveNutritionSection(section: string | null): NutritionSection {
  if (section && NUTRITION_SECTIONS.includes(section as NutritionSection)) {
    return section as NutritionSection
  }
  return 'tracking'
}

function buildNutritionSectionUrl(
  pathname: string,
  section: NutritionSection,
  searchParams: URLSearchParams
) {
  const params = new URLSearchParams(searchParams.toString())
  params.set('tab', 'nutrition')
  if (section === 'tracking') {
    params.delete('section')
  } else {
    params.set('section', section)
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

type ClientDetailNutritionSectionProps = {
  client: Pick<Client, 'id' | 'full_name' | 'user_id'>
  profile: ClientNutritionProfile | null
  logs: ClientNutritionLog[]
  assignment: MealPlanAssignmentWithPlan | null
  mealPlans: Pick<MealPlan, 'id' | 'name' | 'status'>[]
  clientMealPlans: Pick<MealPlan, 'id' | 'name' | 'status' | 'updated_at'>[]
  planDays: MealPlanDayWithMeals[]
  foodDiaryEntries: ClientFoodDiaryEntry[]
  checkedFoodKeys: string[]
  goals: ClientGoal[]
  latestScan: ClientInbodyScan | null
  biologicalSex: BiologicalSex | null
}

export function ClientDetailNutritionSection({
  client,
  profile,
  logs,
  assignment,
  mealPlans,
  clientMealPlans,
  planDays,
  foodDiaryEntries,
  checkedFoodKeys,
  goals,
  latestScan,
  biologicalSex,
}: ClientDetailNutritionSectionProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlSection = searchParams.get('section')
  const [nutritionSection, setNutritionSection] = React.useState<NutritionSection>(
    () => resolveNutritionSection(urlSection)
  )

  React.useEffect(() => {
    setNutritionSection(resolveNutritionSection(urlSection))
  }, [urlSection])

  function handleNutritionSectionChange(value: string) {
    const section = value as NutritionSection
    setNutritionSection(section)
    router.replace(buildNutritionSectionUrl(pathname, section, searchParams), {
      scroll: false,
    })
  }

  return (
    <Tabs
      value={nutritionSection}
      onValueChange={handleNutritionSectionChange}
      variant="filter"
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max flex-nowrap">
          <TabsTrigger value="tracking" size="sm">
            Tracking
          </TabsTrigger>
          <TabsTrigger value="setup" size="sm">
            Setup
          </TabsTrigger>
          <TabsTrigger value="shopping" size="sm">
            Shopping
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tracking" className="mt-4">
        <ClientNutritionTrackingPanel
          client={client}
          profile={profile}
          logs={logs}
          assignment={assignment}
          planDays={planDays}
          foodDiaryEntries={foodDiaryEntries}
        />
      </TabsContent>

      <TabsContent value="setup" className="mt-4">
        <ClientNutritionSetupPanel
          client={client}
          profile={profile}
          assignment={assignment}
          mealPlans={mealPlans}
          clientMealPlans={clientMealPlans}
          planDays={planDays}
          goals={goals}
          latestScan={latestScan}
          biologicalSex={biologicalSex}
        />
      </TabsContent>

      <TabsContent value="shopping" className="mt-4">
        <ShoppingListCard
          assignment={assignment}
          days={planDays}
          planName={assignment?.meal_plan?.name}
          audience="coach"
          checkedFoodKeys={checkedFoodKeys}
          onToggleChecked={
            assignment
              ? async (foodKey, checked) => {
                  const result = await toggleClientShoppingListCheck(client.id, {
                    assignmentId: assignment.id,
                    foodKey,
                    checked,
                  })
                  if (result.success) {
                    router.refresh()
                  }
                  return result
                }
              : undefined
          }
          onCyclesChange={
            assignment
              ? async (cycles) =>
                  updateClientShoppingListCycles(client.id, {
                    assignmentId: assignment.id,
                    cycles,
                  })
              : undefined
          }
        />
      </TabsContent>
    </Tabs>
  )
}
