'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { GymOverviewPanel } from '@/components/gym/gym-overview-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { GymOwnerDashboard } from '@/lib/gym-metrics'

const OWNER_TABS = ['overview', 'manage'] as const
type OwnerTab = (typeof OWNER_TABS)[number]

function resolveOwnerTab(tab: string | null | undefined): OwnerTab {
  if (tab && OWNER_TABS.includes(tab as OwnerTab)) {
    return tab as OwnerTab
  }
  return 'overview'
}

type GymPageTabsProps = {
  gymId: string
  gymName: string
  dashboard: GymOwnerDashboard
  manageContent: React.ReactNode
}

export function GymPageTabs({
  gymId,
  gymName,
  dashboard,
  manageContent,
}: GymPageTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = resolveOwnerTab(searchParams.get('tab'))

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="manage">Manage</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        <GymOverviewPanel
          gymId={gymId}
          gymName={gymName}
          dashboard={dashboard}
        />
      </TabsContent>

      <TabsContent value="manage" className="mt-0 space-y-8">
        {manageContent}
      </TabsContent>
    </Tabs>
  )
}
