import { fetchCoachProgressPhotos } from '@/app/(dashboard)/progress-photos/actions'
import { ProgressPhotosFeed } from '@/components/progress-photos/client-progress-photos-panel'
import { PageHeader } from '@/components/dashboard/page-header'

export const metadata = {
  title: 'Progress Photos — Coaching App',
}

export default async function ProgressPhotosPage() {
  const photos = await fetchCoachProgressPhotos(50)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title="Progress Photos"
        description="Recent progress photos uploaded by clients during check-ins."
      />
      <ProgressPhotosFeed photos={photos} />
    </div>
  )
}
