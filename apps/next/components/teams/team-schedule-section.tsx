'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { TeamEventsPanel } from '@/components/teams/team-events-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  TeamEventWithMemberStatus,
  TeamMemberWithClient,
} from 'app/types/database'

const SCHEDULE_SECTIONS = ['calendar', 'program', 'events'] as const
type ScheduleSection = (typeof SCHEDULE_SECTIONS)[number]

function resolveScheduleSection(section: string | null): ScheduleSection {
  if (section && SCHEDULE_SECTIONS.includes(section as ScheduleSection)) {
    return section as ScheduleSection
  }
  return 'calendar'
}

type TeamScheduleSectionProps = {
  teamId: string
  events: TeamEventWithMemberStatus[]
  members: TeamMemberWithClient[]
  calendarPanel: React.ReactNode
  programPanel: React.ReactNode
}

export function TeamScheduleSection({
  teamId,
  events,
  members,
  calendarPanel,
  programPanel,
}: TeamScheduleSectionProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const scheduleSection = resolveScheduleSection(searchParams.get('section'))
  const highlightDate = searchParams.get('date')

  function buildUrl(section: ScheduleSection) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'schedule')
    if (section === 'calendar') {
      params.delete('section')
    } else {
      params.set('section', section)
    }
    if (section !== 'events') {
      params.delete('date')
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function handleSectionChange(value: string) {
    router.replace(buildUrl(value as ScheduleSection), { scroll: false })
  }

  return (
    <Tabs
      value={scheduleSection}
      onValueChange={handleSectionChange}
      variant="filter"
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max flex-nowrap">
          <TabsTrigger value="calendar" size="sm">
            Calendar
          </TabsTrigger>
          <TabsTrigger value="program" size="sm">
            Program
          </TabsTrigger>
          <TabsTrigger value="events" size="sm">
            Events
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="calendar" className="mt-4">
        {calendarPanel}
      </TabsContent>

      <TabsContent value="program" className="mt-4">
        {programPanel}
      </TabsContent>

      <TabsContent value="events" className="mt-4">
        <TeamEventsPanel
          teamId={teamId}
          events={events}
          members={members}
          highlightDate={highlightDate}
        />
      </TabsContent>
    </Tabs>
  )
}
