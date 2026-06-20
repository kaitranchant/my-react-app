'use client'

import * as React from 'react'

import {
  CheckInList,
  CoachLogCheckInCard,
} from '@/components/check-ins/check-in-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Client, ClientCheckIn, ClientProgressPhotoWithUrl, WeightUnit } from 'app/types/database'

type ClientCheckInsPanelProps = {
  client: Pick<Client, 'id' | 'full_name'>
  checkIns: ClientCheckIn[]
  photoCounts?: Record<string, number>
  photosByCheckInId?: Record<string, ClientProgressPhotoWithUrl[]>
  weightUnit?: WeightUnit
}

export function ClientCheckInsPanel({
  client,
  checkIns,
  photoCounts = {},
  photosByCheckInId = {},
  weightUnit = 'lbs',
}: ClientCheckInsPanelProps) {
  const [tab, setTab] = React.useState<'history' | 'log'>('history')

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as 'history' | 'log')}>
      <TabsList>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="log">Log check-in</TabsTrigger>
      </TabsList>

      <TabsContent value="history" className="mt-4">
        <CheckInList
          checkIns={checkIns}
          clientId={client.id}
          photoCounts={photoCounts}
          photosByCheckInId={photosByCheckInId}
          weightUnit={weightUnit}
          emptyMessage="No check-ins logged for this client yet."
        />
      </TabsContent>

      <TabsContent value="log" className="mt-4">
        <CoachLogCheckInCard
          clients={[{ id: client.id, full_name: client.full_name }]}
          defaultClientId={client.id}
          allCheckIns={checkIns}
        />
      </TabsContent>
    </Tabs>
  )
}
