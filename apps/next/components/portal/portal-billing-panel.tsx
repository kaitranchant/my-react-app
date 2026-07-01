'use client'

import { ExternalLink } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  ClientBillingSubscription,
  ClientInvoice,
} from 'app/types/database'

type PortalBillingPanelProps = {
  invoices: ClientInvoice[]
  subscriptions: ClientBillingSubscription[]
  paymentSuccess?: boolean
  paymentCanceled?: boolean
}

function formatMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function PortalBillingPanel({
  invoices,
  subscriptions,
  paymentSuccess = false,
  paymentCanceled = false,
}: PortalBillingPanelProps) {
  const openInvoices = invoices.filter((invoice) => invoice.status === 'open')
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid')
  const activeSubscriptions = subscriptions.filter((subscription) =>
    ['active', 'trialing', 'past_due'].includes(subscription.status)
  )
  const pendingSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === 'incomplete' && Boolean(subscription.checkout_url)
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {paymentSuccess ? (
        <div className="border-status-success/30 bg-status-success/10 text-status-success-foreground rounded-lg border px-4 py-3 text-sm">
          Payment received. Thank you!
        </div>
      ) : null}

      {paymentCanceled ? (
        <div className="border-border bg-muted/50 rounded-lg border px-4 py-3 text-sm">
          Payment was canceled. You can try again anytime.
        </div>
      ) : null}

      {openInvoices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Amount due</CardTitle>
            <CardDescription>Open invoices from your coach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {openInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{invoice.description}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatMoney(invoice.amount_cents, invoice.currency)}
                    {invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ''}
                  </p>
                </div>
                {invoice.hosted_invoice_url ? (
                  <Button asChild>
                    <a
                      href={invoice.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Pay now
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {pendingSubscriptions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complete subscription setup</CardTitle>
            <CardDescription>
              Finish checkout to activate recurring billing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSubscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{subscription.description}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatMoney(subscription.amount_cents, subscription.currency)}/
                    {subscription.interval === 'year' ? 'yr' : 'mo'}
                  </p>
                </div>
                {subscription.checkout_url ? (
                  <Button asChild>
                    <a
                      href={subscription.checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Complete payment
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {activeSubscriptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active subscriptions.</p>
          ) : (
            <div className="space-y-3">
              {activeSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{subscription.description}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatMoney(subscription.amount_cents, subscription.currency)}/
                      {subscription.interval === 'year' ? 'yr' : 'mo'}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge>{subscription.status}</Badge>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Renews {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {paidInvoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No paid invoices yet.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {paidInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm"
                  >
                    <div className="col-span-2 min-w-0">
                      <p className="text-muted-foreground text-xs">Description</p>
                      <p className="mt-0.5 font-medium">{invoice.description}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Amount</p>
                      <p className="mt-0.5 font-medium">
                        {formatMoney(invoice.amount_cents, invoice.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Paid</p>
                      <p className="mt-0.5 font-medium">{formatDate(invoice.paid_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.description}</TableCell>
                      <TableCell>
                        {formatMoney(invoice.amount_cents, invoice.currency)}
                      </TableCell>
                      <TableCell>{formatDate(invoice.paid_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
