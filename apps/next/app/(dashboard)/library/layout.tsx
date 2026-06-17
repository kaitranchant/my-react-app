import { PageHeader } from '@/components/dashboard/page-header'
import { LibraryTabs } from '@/components/library/library-tabs'

export const metadata = {
  title: 'Library — Coaching App',
}

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Library"
        description="Your exercises, workouts, and programs — build once, reuse across clients."
      />
      <LibraryTabs />
      {children}
    </div>
  )
}
