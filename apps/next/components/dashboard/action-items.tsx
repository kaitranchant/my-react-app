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
    bg: 'hover:bg-amber-50/50',
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
    <Card className="h-full">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base font-semibold">
          Needs your attention
        </CardTitle>
        <CardDescription>
          Follow up on these items to keep clients on track
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
            <div className="bg-brand/10 text-brand flex size-12 items-center justify-center rounded-xl">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">You&apos;re all caught up</p>
              <p className="text-xs leading-relaxed">
                No pending items right now. Check back as your clients progress.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const style = priorityStyles[item.priority]
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border-l-[3px] py-3 pr-3 pl-4 text-sm transition-colors',
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
