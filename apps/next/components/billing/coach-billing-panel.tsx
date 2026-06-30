'use client'

import * as React from 'react'
import { ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  cancelClientSubscriptionAction,
  voidClientInvoiceAction,
} from '@/app/(dashboard)/billing/actions'
import { CreateInvoiceDialog } from '@/components/billing/create-invoice-dialog'
import { CreateSubscriptionDialog } from '@/components/billing/create-subscription-dialog'
import {
  ConnectDashboardButton,
  ConnectOnboardingButton,
  ConnectSyncButton,
  LiveHttpsConnectHelp,
} from '@/components/billing/connect-buttons'
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
  ClientBillingSubscriptionWithClient,
  ClientInvoiceWithClient,
  CoachBillingOverview,
} from '@/lib/client-billing-queries'
import type { ConnectAccountStatus } from '@/lib/stripe/connect'
import type { StripeKeyMode } from '@/lib/stripe/config'

type CoachBillingPanelProps = {
  connectStatus: ConnectAccountStatus
  overview: CoachBillingOverview
  invoices: ClientInvoiceWithClient[]
  subscriptions: ClientBillingSubscriptionWithClient[]
  clients: Array<{ id: string; full_name: string | null; email: string | null }>
  stripeEnabled: boolean
  stripeKeyMode?: StripeKeyMode | null
  liveModeHttpsBlocked?: boolean
  appBaseUrl?: string
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

function invoiceStatusVariant(
  status: ClientInvoiceWithClient['status']
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'paid') return 'default'
  if (status === 'open') return 'secondary'
  if (status === 'void' || status === 'uncollectible') return 'outline'
  return 'outline'
}

function subscriptionStatusVariant(
  status: ClientBillingSubscriptionWithClient['status']
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'active' || status === 'trialing') return 'default'
  if (status === 'past_due' || status === 'incomplete') return 'secondary'
  return 'outline'
}

function VoidInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = React.useState(false)

  async function handleVoid() {
    setLoading(true)
    try {
      const result = await voidClientInvoiceAction(invoiceId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Invoice voided.')
    } catch {
      toast.error('Could not void invoice.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      disabled={loading}
      onClick={handleVoid}
      aria-label="Void invoice"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </Button>
  )
}

function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [loading, setLoading] = React.useState(false)

  async function handleCancel() {
    setLoading(true)
    try {
      const result = await cancelClientSubscriptionAction(subscriptionId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Subscription will cancel at period end.')
    } catch {
      toast.error('Could not cancel subscription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={loading}
      onClick={handleCancel}
    >
      {loading ? 'Canceling…' : 'Cancel at period end'}
    </Button>
  )
}

export function CoachBillingPanel({
  connectStatus,
  overview,
  invoices,
  subscriptions,
  clients,
  stripeEnabled,
  stripeKeyMode = null,
  liveModeHttpsBlocked = false,
  appBaseUrl = 'http://localhost:3000',
}: CoachBillingPanelProps) {
  const billingEnabled = stripeEnabled && connectStatus.isReady

  return (
    <div className="space-y-6">
      {!connectStatus.isReady ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connect Stripe to get started</CardTitle>
            <CardDescription>
              Link your Stripe account to send invoices and set up recurring client
              billing. You can finish setup in Settings → Payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {liveModeHttpsBlocked ? (
              <LiveHttpsConnectHelp
                appBaseUrl={appBaseUrl}
                hasStuckAccount={Boolean(connectStatus.accountId)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <ConnectOnboardingButton stripeKeyMode={stripeKeyMode}>
                  {connectStatus.accountId ? 'Continue Stripe setup' : 'Connect Stripe'}
                </ConnectOnboardingButton>
                {connectStatus.accountId ? <ConnectSyncButton /> : null}
                {connectStatus.accountId &&
                (connectStatus.isReady || connectStatus.detailsSubmitted) ? (
                  <ConnectDashboardButton>Open Stripe dashboard</ConnectDashboardButton>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs">Open invoices</p>
            <p className="mt-1 text-2xl font-semibold">{overview.openInvoiceCount}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {formatMoney(overview.openInvoiceTotalCents)} outstanding
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs">Collected</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatMoney(overview.paidInvoiceTotalCents)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">Paid invoices</p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs">Active subscriptions</p>
            <p className="mt-1 text-2xl font-semibold">
              {overview.activeSubscriptionCount}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">Recurring clients</p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="px-4 py-4">
            <p className="text-muted-foreground text-xs">Monthly recurring</p>
            <p className="mt-1 text-2xl font-semibold">
              {formatMoney(overview.monthlyRecurringCents)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">Estimated MRR</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <CreateInvoiceDialog clients={clients} disabled={!billingEnabled} />
        <CreateSubscriptionDialog clients={clients} disabled={!billingEnabled} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>One-time charges sent to clients.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.client.full_name ?? 'Client'}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {invoice.description}
                    </TableCell>
                    <TableCell>{formatMoney(invoice.amount_cents, invoice.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceStatusVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {invoice.hosted_invoice_url ? (
                          <Button asChild variant="ghost" size="icon" className="size-8">
                            <a
                              href={invoice.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open invoice"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                        ) : null}
                        {invoice.status === 'open' ? (
                          <VoidInvoiceButton invoiceId={invoice.id} />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscriptions</CardTitle>
          <CardDescription>Recurring billing for coaching retainers.</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No subscriptions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next period end</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>{subscription.client.full_name ?? 'Client'}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {subscription.description}
                    </TableCell>
                    <TableCell>
                      {formatMoney(subscription.amount_cents, subscription.currency)}/
                      {subscription.interval === 'year' ? 'yr' : 'mo'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscriptionStatusVariant(subscription.status)}>
                        {subscription.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(subscription.current_period_end)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {subscription.checkout_url ? (
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={subscription.checkout_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Checkout link
                            </a>
                          </Button>
                        ) : null}
                        {subscription.status === 'active' ||
                        subscription.status === 'trialing' ||
                        subscription.status === 'past_due' ? (
                          <CancelSubscriptionButton subscriptionId={subscription.id} />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
