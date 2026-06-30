import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ConnectAccountStatus } from '@/lib/stripe/connect'
import {
  ConnectDashboardButton,
  ConnectOnboardingButton,
  ConnectSyncButton,
  LiveHttpsConnectHelp,
} from '@/components/billing/connect-buttons'
import { isStripeConfigured, type StripeKeyMode } from '@/lib/stripe/config'
import { getStripePlatformProfileUrl } from '@/lib/stripe/connect-errors'

type PaymentsSettingsProps = {
  connectStatus: ConnectAccountStatus
  connectSuccess?: boolean
  connectRefresh?: boolean
  stripeKeyMode?: StripeKeyMode | null
  liveModeHttpsBlocked?: boolean
  appBaseUrl?: string
}

export function PaymentsSettings({
  connectStatus,
  connectSuccess = false,
  connectRefresh = false,
  stripeKeyMode = null,
  liveModeHttpsBlocked = false,
  appBaseUrl = 'http://localhost:3000',
}: PaymentsSettingsProps) {
  const stripeEnabled = isStripeConfigured()
  const isReady = connectStatus.isReady
  const platformProfileUrl = getStripePlatformProfileUrl(stripeKeyMode)

  return (
    <div className="space-y-4">
      {connectSuccess && isReady ? (
        <div className="border-status-success/30 bg-status-success/10 text-status-success-foreground rounded-lg border px-4 py-3 text-sm">
          Stripe Connect is ready. You can bill clients from Client billing.
        </div>
      ) : null}

      {connectSuccess && !isReady ? (
        <div className="border-border bg-muted/50 rounded-lg border px-4 py-3 text-sm">
          Returned from Stripe. Status was refreshed — if charges are still pending,
          use Continue Stripe setup or Refresh status below.
        </div>
      ) : null}

      {connectRefresh ? (
        <div className="border-border bg-muted/50 rounded-lg border px-4 py-3 text-sm">
          Stripe onboarding was interrupted. Continue setup to finish connecting
          your account.
        </div>
      ) : null}

      {liveModeHttpsBlocked ? (
        <LiveHttpsConnectHelp
          appBaseUrl={appBaseUrl}
          hasStuckAccount={Boolean(connectStatus.accountId)}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client payments</CardTitle>
          <CardDescription>
            Connect Stripe to send invoices and collect recurring payments from
            clients. Payouts go directly to your bank account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!stripeEnabled ? (
            <p className="text-muted-foreground text-sm">
              Stripe is not configured in this environment.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant={isReady ? 'default' : 'secondary'}>
                  {isReady ? 'Ready to bill clients' : 'Setup required'}
                </Badge>
                {connectStatus.accountId ? (
                  <>
                    <Badge variant={connectStatus.chargesEnabled ? 'default' : 'outline'}>
                      Charges {connectStatus.chargesEnabled ? 'enabled' : 'pending'}
                    </Badge>
                    <Badge variant={connectStatus.payoutsEnabled ? 'default' : 'outline'}>
                      Payouts {connectStatus.payoutsEnabled ? 'enabled' : 'pending'}
                    </Badge>
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {!isReady && !liveModeHttpsBlocked ? (
                  <ConnectOnboardingButton stripeKeyMode={stripeKeyMode}>
                    {connectStatus.accountId
                      ? 'Continue Stripe setup'
                      : 'Connect Stripe'}
                  </ConnectOnboardingButton>
                ) : null}

                {connectStatus.accountId && !liveModeHttpsBlocked ? (
                  <ConnectSyncButton />
                ) : null}

                {connectStatus.accountId &&
                (isReady || connectStatus.detailsSubmitted) &&
                !liveModeHttpsBlocked ? (
                  <ConnectDashboardButton>Open Stripe dashboard</ConnectDashboardButton>
                ) : null}
              </div>

              {!isReady && !liveModeHttpsBlocked ? (
                <p className="text-muted-foreground text-xs">
                  You&apos;ll be redirected to Stripe to verify your business and
                  payout details before you can bill clients.
                </p>
              ) : null}

              {stripeKeyMode === 'live' ? (
                <p className="text-muted-foreground text-xs">
                  Using live Stripe keys. Complete the{' '}
                  <a
                    href={platformProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2"
                  >
                    Connect platform profile
                  </a>{' '}
                  in Stripe (live mode, test mode off) before onboarding.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
