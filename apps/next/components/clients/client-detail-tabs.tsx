'use client'

import * as React from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientNotesEditor } from '@/components/clients/client-notes-editor'
import { ClientOverview } from '@/components/clients/client-overview'
import { ClientProgramsPanel } from '@/components/programs/client-programs-panel'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type {
  Client,
  ClientProgramAssignment,
  Program,
} from 'app/types/database'

function ComingSoon({ feature }: { feature: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{feature}</CardTitle>
        <CardDescription>
          This is where {feature.toLowerCase()} will live. Coming soon.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

type ClientDetailTabsProps = {
  client: Client
  activeAssignment: ClientProgramAssignment | null
  availablePrograms: Pick<Program, 'id' | 'name' | 'status'>[]
}

export function ClientDetailTabs({
  client,
  activeAssignment,
  availablePrograms,
}: ClientDetailTabsProps) {
  const [tab, setTab] = React.useState('overview')

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="h-10">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="programs">Programs</TabsTrigger>
        <TabsTrigger value="progress-photos">Progress photos</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <ClientOverview
          client={client}
          activeAssignment={activeAssignment}
          onOpenNotes={() => setTab('notes')}
        />
      </TabsContent>

      <TabsContent value="programs" className="mt-4">
        <ClientProgramsPanel
          clientId={client.id}
          activeAssignment={activeAssignment}
          availablePrograms={availablePrograms}
        />
      </TabsContent>

      <TabsContent value="progress-photos" className="mt-4">
        <ComingSoon feature="Progress photos" />
      </TabsContent>

      <TabsContent value="notes" className="mt-4">
        <ClientNotesEditor
          clientId={client.id}
          initialNotes={client.notes}
        />
      </TabsContent>
    </Tabs>
  )
}
