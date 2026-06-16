'use client'

import { Mail, Phone, Target } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Client } from 'app/types/database'

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

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-4" />
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm">{value?.trim() ? value : '—'}</p>
      </div>
    </div>
  )
}

export function ClientDetailTabs({ client }: { client: Client }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="workouts">Workouts</TabsTrigger>
        <TabsTrigger value="check-ins">Check-ins</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <InfoRow icon={Mail} label="Email" value={client.email} />
              <InfoRow icon={Phone} label="Phone" value={client.phone} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow icon={Target} label="Primary goal" value={client.goal} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="workouts" className="mt-4">
        <ComingSoon feature="Workouts" />
      </TabsContent>

      <TabsContent value="check-ins" className="mt-4">
        <ComingSoon feature="Check-ins" />
      </TabsContent>

      <TabsContent value="notes" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {client.notes?.trim() ? (
                client.notes
              ) : (
                <span className="text-muted-foreground">
                  No notes yet. Use “Edit” to add context about this client.
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
