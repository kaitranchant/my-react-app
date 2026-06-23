import Link from 'next/link'
import { ArrowRight, Flame, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import type { RecentPrHighlight } from '@/lib/pr-records'

type PortalRecentPrsProps = {
  recentPrs: RecentPrHighlight[]
  showViewAll?: boolean
  presentation?: 'default' | 'portal'
}

function MobileSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </p>
  )
}

export function PortalRecentPrs({
  recentPrs,
  showViewAll = false,
  presentation = 'default',
}: PortalRecentPrsProps) {
  const isPortal = presentation === 'portal'
  if (recentPrs.length === 0) {
    const emptyCard = (
      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
          <div className="flex items-center gap-2">
            {!isPortal ? <TrendingUp className="text-brand size-4" /> : null}
            <p className={isPortal ? 'text-sm font-medium' : 'section-header'}>
              {isPortal ? 'Personal records' : 'Recent PRs'}
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <EmptyState
            icon={Flame}
            title="No personal records yet"
            description="Beat your previous best on a logged set and your PRs will show up here."
            action={{ label: 'Log a workout', href: '/portal/workouts' }}
            className="py-6"
          />
        </CardContent>
      </Card>
    )

    return isPortal ? (
      <section className="space-y-3">
        <MobileSectionLabel>Recent PRs</MobileSectionLabel>
        {emptyCard}
      </section>
    ) : (
      emptyCard
    )
  }

  const prCard = (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
        <div className="flex items-center gap-2">
          {!isPortal ? <TrendingUp className="text-brand size-4" /> : null}
          <p className={isPortal ? 'text-sm font-medium' : 'section-header'}>
            {isPortal ? 'Personal records' : 'Recent PRs'}
          </p>
        </div>
        {showViewAll && (
          <Link
            href="/portal/progress"
            className="text-brand flex items-center gap-1 text-xs font-medium"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <ul className="space-y-2">
          {recentPrs.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 border-b py-2 text-sm last:border-b-0"
            >
              <span className="flex items-center gap-2">
                <Flame className="text-amber-500 size-4 shrink-0" />
                {item.exerciseName} · {item.label}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {item.date}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )

  return isPortal ? (
    <section className="space-y-3">
      <MobileSectionLabel>Recent PRs</MobileSectionLabel>
      {prCard}
    </section>
  ) : (
    prCard
  )
}
