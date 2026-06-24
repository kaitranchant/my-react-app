'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  clientDetailTabSkeleton,
  type ClientDetailMainTab,
} from '@/components/clients/client-detail-tab-skeletons'
import { resolveClientDetailMainTab } from '@/lib/client-detail-tabs'

const LEGACY_TABS = [
  'calendar',
  'programs',
  'check-ins',
  'progress-photos',
  'form-reviews',
  'inbody',
  'goals',
  'notes',
] as const

function isLegacyTab(tab: string | null): boolean {
  return (
    tab !== null &&
    LEGACY_TABS.includes(tab as (typeof LEGACY_TABS)[number])
  )
}

function tabSkeleton(tab: ClientDetailMainTab) {
  return clientDetailTabSkeleton(tab)
}

type ClientDetailTabsProps = {
  activeTab: ClientDetailMainTab
  children: React.ReactNode
}

export function ClientDetailTabs({
  activeTab,
  children,
}: ClientDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pendingTab, setPendingTab] = React.useState<ClientDetailMainTab | null>(
    null
  )

  const displayedTab = pendingTab ?? activeTab

  function buildUrl(nextMain: ClientDetailMainTab) {
    const params = new URLSearchParams(searchParams.toString())

    if (nextMain === 'overview') {
      params.delete('tab')
      params.delete('section')
    } else {
      params.set('tab', nextMain)
      if (nextMain !== 'training' && nextMain !== 'progress') {
        params.delete('section')
      }
    }

    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  React.useEffect(() => {
    setPendingTab(null)
  }, [activeTab, searchParams])

  React.useEffect(() => {
    const tab = searchParams.get('tab')
    const resolvedMain = resolveClientDetailMainTab(tab)

    if (isLegacyTab(tab)) {
      const href =
        resolvedMain === 'training'
          ? buildUrl('training')
          : resolvedMain === 'progress'
            ? (() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('tab', 'progress')
                if (tab && tab !== 'goals') {
                  params.set('section', tab)
                }
                const query = params.toString()
                return query ? `${pathname}?${query}` : pathname
              })()
            : buildUrl('overview')
      router.replace(href, { scroll: false })
    }
  }, [searchParams])

  function handleMainTabChange(value: string) {
    const next = value as ClientDetailMainTab
    setPendingTab(next)
    router.replace(buildUrl(next), { scroll: false })
  }

  const panel =
    pendingTab && pendingTab !== activeTab ? tabSkeleton(pendingTab) : children

  return (
    <Tabs value={displayedTab} onValueChange={handleMainTabChange} variant="filter">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-4 space-y-3 md:space-y-4">
        {displayedTab === 'overview' ? panel : null}
      </TabsContent>

      <TabsContent value="training" className="mt-4">
        {displayedTab === 'training' ? panel : null}
      </TabsContent>

      <TabsContent value="progress" className="mt-4">
        {displayedTab === 'progress' ? panel : null}
      </TabsContent>

      <TabsContent value="messages" className="mt-4">
        {displayedTab === 'messages' ? panel : null}
      </TabsContent>
    </Tabs>
  )
}
