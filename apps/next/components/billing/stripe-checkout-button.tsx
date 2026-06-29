'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { startStripeCheckout } from '@/app/(dashboard)/settings/billing-actions'
import { Button } from '@/components/ui/button'
import type { BillingInterval, SubscriptionPlan } from '@/lib/subscription-plans'
import { cn } from '@/lib/utils'

type StripeCheckoutButtonProps = {
  plan: Extract<SubscriptionPlan, 'growth' | 'scale' | 'facility'>
  interval?: BillingInterval
  gymId?: string
  children: React.ReactNode
  variant?: 'brand' | 'outline' | 'ghost' | 'default' | 'secondary' | 'destructive' | 'link'
  className?: string
  disabled?: boolean
}

export function StripeCheckoutButton({
  plan,
  interval = 'monthly',
  gymId,
  children,
  variant = 'brand',
  className,
  disabled = false,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = React.useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const result = await startStripeCheckout({ plan, interval, gymId })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      window.location.href = result.url
    } catch {
      toast.error('Could not start checkout.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn(className)}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}

type StripePortalButtonProps = {
  children: React.ReactNode
  variant?: 'brand' | 'outline' | 'ghost' | 'default' | 'secondary' | 'destructive' | 'link'
  className?: string
}

export function StripePortalButton({
  children,
  variant = 'outline',
  className,
}: StripePortalButtonProps) {
  const [loading, setLoading] = React.useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const { openStripeBillingPortal } = await import(
        '@/app/(dashboard)/settings/billing-actions'
      )
      const result = await openStripeBillingPortal()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      window.location.href = result.url
    } catch {
      toast.error('Could not open billing portal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={cn(className)}
      disabled={loading}
      onClick={handleClick}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}
