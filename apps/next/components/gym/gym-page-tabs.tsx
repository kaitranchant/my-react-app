'use client'

import * as React from 'react'

import { GymOverviewPanel } from '@/components/gym/gym-overview-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { GymOwnerDashboard } from '@/lib/gym-metrics'

const OWNER_TABS = ['overview', 'manage'] as const
type OwnerTab = (typeof OWNER_TABS)[number]

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
  const [activeTab, setActiveTab] = React.useState<OwnerTab>('overview')
  const [hasOpenedManage, setHasOpenedManage] = React.useState(false)

  function handleTabChange(value: string) {
    const nextTab = value as OwnerTab
    setActiveTab(nextTab)
    if (nextTab === 'manage') {
      setHasOpenedManage(true)
    }
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

      <TabsContent value="manage" className="mt-0">
        {hasOpenedManage ? manageContent : null}
      </TabsContent>
    </Tabs>
  )
}
