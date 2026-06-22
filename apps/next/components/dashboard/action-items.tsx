import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ActionItem } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

const priorityStyles = {
  high: {
    border: 'border-l-amber-400',
    bg: 'hover:bg-amber-50/50 dark:hover:bg-amber-500/5',
  },
  medium: {
    border: 'border-l-brand',
    bg: 'hover:bg-brand/5',
  },
  low: {
    border: 'border-l-border',
    bg: 'hover:bg-muted/50',
  },
} as const

type ActionItemsProps = {
  items: ActionItem[]
}

export function ActionItems({ items }: ActionItemsProps) {
  return (
    <Card className="h-full gap-0 py-0">
      <CardHeader className="border-b px-4 py-4 sm:px-6 sm:pb-4">
        <CardTitle>Needs your attention</CardTitle>
        <CardDescription>
          Follow up to keep clients on track
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 py-0 sm:px-6 sm:pt-5">
        {items.length === 0 ? (
          <div className="body-text flex flex-col items-center gap-3 px-4 py-10 text-center text-muted-foreground sm:px-0">
            <div className="bg-brand/10 text-brand flex size-12 items-center justify-center rounded-xl">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="section-header text-foreground">You&apos;re all caught up</p>
              <p className="helper-text leading-relaxed">
                No pending items right now. Check back as your clients progress.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const style = priorityStyles[item.priority]
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      'body-text flex items-center gap-3 border-l-[3px] py-3.5 pr-4 pl-4 transition-colors sm:rounded-lg sm:border-l-[3px] sm:py-3 sm:pr-3 sm:pl-4',
                      style.border,
                      style.bg
                    )}
                  >
                    <span className="flex-1 leading-snug">{item.message}</span>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
