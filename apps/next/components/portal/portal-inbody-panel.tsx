'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  deleteClientInbodyScan,
  submitClientInbodyScan,
  updateClientInbodyScan,
} from '@/app/portal/inbody-actions'
import { InbodyCompositionHistoryChart } from '@/components/inbody/inbody-composition-history-chart'
import { InbodyScanForm } from '@/components/inbody/inbody-scan-form'
import { InbodyScanList } from '@/components/inbody/inbody-scan-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { scansToChartPoints } from '@/lib/inbody-scans'
import type { ClientInbodyScan } from 'app/types/database'

type InbodyTab = 'history' | 'graphs' | 'log'

type PortalInbodyPanelProps = {
  scans: ClientInbodyScan[]
}

export function PortalInbodyPanel({ scans }: PortalInbodyPanelProps) {
  const router = useRouter()
  const [tab, setTab] = React.useState<InbodyTab>('log')
  const chartPoints = scansToChartPoints(scans)

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as InbodyTab)}>
      <TabsList>
        <TabsTrigger value="log">Log scan</TabsTrigger>
        <TabsTrigger value="graphs">Graphs</TabsTrigger>
        <TabsTrigger value="history">Scan history</TabsTrigger>
      </TabsList>

      <TabsContent value="log" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Log InBody scan</CardTitle>
            <CardDescription>
              Enter the values from your InBody printout. Weight, skeletal muscle
              mass, and percent body fat are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InbodyScanForm
              onSubmit={async (values) => {
                const result = await submitClientInbodyScan(values)
                return {
                  success: result.success,
                  error: result.success ? undefined : result.error,
                }
              }}
              onSuccess={() => {
                router.refresh()
                setTab('history')
              }}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="graphs" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Body composition history</CardTitle>
            <CardDescription>
              Track every logged metric across your scans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InbodyCompositionHistoryChart points={chartPoints} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <InbodyScanList
          scans={scans}
          emptyMessage="No InBody scans logged yet"
          emptyAction={{
            label: 'Log first scan',
            onClick: () => setTab('log'),
          }}
          canEdit={(scan) => scan.submitted_by === 'client'}
          onUpdate={updateClientInbodyScan}
          onDelete={deleteClientInbodyScan}
        />
      </TabsContent>
    </Tabs>
  )
}
