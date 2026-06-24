'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCoachBookingUrl } from '@/lib/booking-slug'

type BookingLinkCardProps = {
  bookingEnabled: boolean
  coachName: string | null
  appBaseUrl: string
}

export function BookingLinkCard({
  bookingEnabled,
  coachName,
  appBaseUrl,
}: BookingLinkCardProps) {
  const [copied, setCopied] = React.useState(false)

  if (!bookingEnabled) {
    return null
  }

  const bookingUrl = getCoachBookingUrl(appBaseUrl, coachName)
  const shareLabel = bookingUrl.replace(/^https?:\/\//, '')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      toast.success('Booking link copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div className="bg-primary/5 space-y-3 rounded-lg border border-primary/20 p-4">
      <div>
        <p className="text-sm font-medium">Shareable booking link</p>
        <p className="text-muted-foreground text-sm">
          Send this to clients with portal access so they can book sessions.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={shareLabel} className="font-mono text-sm" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="mr-2 size-4" />
            ) : (
              <Copy className="mr-2 size-4" />
            )}
            Copy link
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={bookingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 size-4" />
              Preview
            </a>
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Clients sign in to book at{' '}
        <span className="font-mono">{bookingUrl}</span>.
      </p>
    </div>
  )
}
