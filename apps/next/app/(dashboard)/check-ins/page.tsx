import { createClient } from '@/lib/supabase/server'
import { isCheckInPendingReview } from '@/lib/check-ins'
import {
  attachSignedUrlsToPhotos,
  countPhotosByCheckInId,
} from '@/lib/progress-photos'
import type { ClientProgressPhoto } from 'app/types/database'
import {
  CheckInList,
  CoachLogCheckInCard,
} from '@/components/check-ins/check-in-list'
import { PageHeader } from '@/components/dashboard/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Client, ClientCheckIn } from 'app/types/database'

export const metadata = {
  title: 'Check-ins — Coaching App',
}

type CheckInWithClient = ClientCheckIn & {
  client: Pick<Client, 'id' | 'full_name' | 'avatar_url' | 'email'> | null
}

export default async function CheckInsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const defaultTab =
    tab === 'all' || tab === 'log' ? tab : 'pending'

  const supabase = await createClient()
  const [{ data: checkInsData }, { data: clientsData }] = await Promise.all([
    supabase
      .from('client_check_ins')
      .select(
        '*, client:clients(id, full_name, avatar_url, email)'
      )
      .order('check_in_date', { ascending: false })
      .limit(100),
    supabase
      .from('clients')
      .select('id, full_name')
      .eq('status', 'active')
      .eq('is_coach_self', false)
      .order('full_name', { ascending: true }),
  ])

  const checkIns = (checkInsData ?? []) as CheckInWithClient[]
  const clients = (clientsData ?? []) as Pick<Client, 'id' | 'full_name'>[]
  const pendingCheckIns = checkIns.filter((checkIn) =>
    isCheckInPendingReview(checkIn)
  )

  const checkInIds = checkIns.map((checkIn) => checkIn.id)
  let photoCounts: Record<string, number> = {}
  let photosByCheckInId: Record<string, Awaited<ReturnType<typeof attachSignedUrlsToPhotos>>> = {}

  if (checkInIds.length > 0) {
    const { data: photoData } = await supabase
      .from('client_progress_photos')
      .select('*')
      .in('check_in_id', checkInIds)

    const photos = await attachSignedUrlsToPhotos(
      supabase,
      (photoData ?? []) as ClientProgressPhoto[]
    )
    photoCounts = countPhotosByCheckInId(photos)

    photosByCheckInId = photos.reduce<
      Record<string, typeof photos>
    >((accumulator, photo) => {
      if (!photo.check_in_id) return accumulator
      const existing = accumulator[photo.check_in_id] ?? []
      existing.push(photo)
      accumulator[photo.check_in_id] = existing
      return accumulator
    }, {})
  }

  const listProps = {
    showClient: true as const,
    photoCounts,
    photosByCheckInId,
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Check-ins"
        description="Review client submissions, add feedback, or log metrics on their behalf."
      />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingCheckIns.length > 0 && ` (${pendingCheckIns.length})`}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="log">Log check-in</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <CheckInList
            checkIns={pendingCheckIns.map((checkIn) => ({
              ...checkIn,
              client: checkIn.client ?? undefined,
            }))}
            {...listProps}
            emptyMessage="No client check-ins waiting for review."
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <CheckInList
            checkIns={checkIns.map((checkIn) => ({
              ...checkIn,
              client: checkIn.client ?? undefined,
            }))}
            {...listProps}
            emptyMessage="No check-ins logged yet."
          />
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <CoachLogCheckInCard clients={clients} allCheckIns={checkIns} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
