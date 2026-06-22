'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  deleteCoachInbodyScan,
  submitCoachInbodyScan,
  updateCoachInbodyScan,
} from '@/app/(dashboard)/inbody/actions'
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
import type { Client, ClientInbodyScan } from 'app/types/database'

type InbodyTab = 'history' | 'graphs' | 'log'

type ClientInbodyPanelProps = {
  client: Pick<Client, 'id' | 'full_name'>
  scans: ClientInbodyScan[]
}

export function ClientInbodyPanel({ client, scans }: ClientInbodyPanelProps) {
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
              Enter values from the client&apos;s InBody printout. Only weight,
              SMM, and PBF are required for the history graphs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InbodyScanForm
              onSubmit={async (values) => {
                const result = await submitCoachInbodyScan(client.id, values)
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
              Track every logged metric across scans — weight, muscle mass, body
              fat, and any optional values entered from the printout.
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
          emptyMessage={`No InBody scans logged for ${client.full_name} yet.`}
          emptyAction={{ label: 'Log first scan', onClick: () => setTab('log') }}
          onUpdate={updateCoachInbodyScan}
          onDelete={deleteCoachInbodyScan}
        />
      </TabsContent>
    </Tabs>
  )
}
