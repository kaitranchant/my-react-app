'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarCheck, CalendarDays, MessageSquare, Sparkles, UtensilsCrossed } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const DISMISS_KEY = (userId: string) => `portal-welcome-dismissed:${userId}`

type PortalWelcomeDialogProps = {
  userId: string
  coachName: string
}

export function PortalWelcomeDialog({ userId, coachName }: PortalWelcomeDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    try {
      setOpen(localStorage.getItem(DISMISS_KEY(userId)) !== '1')
    } catch {
      setOpen(true)
    }
    setReady(true)
  }, [userId])

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY(userId), '1')
    } catch {
      // ignore
    }
    setOpen(false)
  }

  if (!ready) {
    return null
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismiss()
        else setOpen(true)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="bg-brand/10 text-brand mb-1 flex size-10 items-center justify-center rounded-lg">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>Welcome to your program</DialogTitle>
          <DialogDescription>
            {coachName} is your coach. Start with today&apos;s workout, share a
            quick check-in, log nutrition, or send a message when you need
            support.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="brand" className="gap-2">
            <Link href="/portal/workouts" onClick={dismiss}>
              <CalendarDays className="size-4" />
              View workouts
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/portal/check-in" onClick={dismiss}>
              <CalendarCheck className="size-4" />
              Submit check-in
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/portal/nutrition" onClick={dismiss}>
              <UtensilsCrossed className="size-4" />
              Nutrition
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/portal/messages" onClick={dismiss}>
              <MessageSquare className="size-4" />
              Messages
            </Link>
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={dismiss}>
            Explore on my own
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
