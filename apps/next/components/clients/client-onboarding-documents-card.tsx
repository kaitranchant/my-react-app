'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  Mail,
  TabletSmartphone,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  getOnboardingSignLink,
  resendOnboardingDocumentsEmail,
} from '@/app/(dashboard)/clients/onboarding-actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buildOnboardingInPersonSignUrl } from '@/lib/invite'
import {
  formatOnboardingSignDate,
} from '@/lib/onboarding-signing'
import type { ClientOnboardingDocumentsSummary } from '@/lib/onboarding-data'
import { getActiveOnboardingPacket } from '@/lib/onboarding-data'
import { onboardingDocumentTypeLabels } from '@/lib/onboarding-documents'

type ClientOnboardingDocumentsCardProps = {
  clientId: string
  clientName: string
  summary: ClientOnboardingDocumentsSummary
}

export function ClientOnboardingDocumentsCard({
  clientId,
  clientName,
  summary,
}: ClientOnboardingDocumentsCardProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = React.useState<string | null>(null)

  const activePacket = getActiveOnboardingPacket(summary.packets)
  const latestRequests = summary.requests
  const hasHistory = latestRequests.length > 0

  if (!hasHistory) {
    return null
  }

  async function copySignLink(packetId: string) {
    setPendingAction(`copy-${packetId}`)
    const result = await getOnboardingSignLink(packetId)
    setPendingAction(null)

    if (!result.success) {
      toast.error('error' in result ? result.error : 'Could not get sign link.')
      return
    }

    if (!result.signUrl) {
      toast.error('Sign link is not available.')
      return
    }

    await navigator.clipboard.writeText(result.signUrl)
    toast.success('Sign link copied.')
  }

  async function resendEmail(packetId: string) {
    setPendingAction(`resend-${packetId}`)
    const result = await resendOnboardingDocumentsEmail(packetId)
    setPendingAction(null)

    if (!result.success) {
      toast.error(result.error)
      if (result.signUrl) {
        await navigator.clipboard.writeText(result.signUrl)
        toast.message('Sign link copied to clipboard.')
      }
      return
    }

    toast.success(`Documents resent to ${clientName}.`)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          Onboarding documents
        </CardTitle>
        <CardDescription>
          PAR-Q, liability, and other signed onboarding documents for {clientName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {activePacket ? (
          <div className="bg-muted/40 flex flex-col gap-3 rounded-md border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              <p className="font-medium">Active signing packet</p>
              <p className="text-muted-foreground">
                Requested {formatOnboardingSignDate(activePacket.requested_at)}
                {activePacket.signer_email
                  ? ` · ${activePacket.signer_email}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={buildOnboardingInPersonSignUrl(clientId, activePacket.id)}>
                  <TabletSmartphone className="size-4" />
                  Sign in person
                </Link>
              </Button>
              {activePacket.signer_email ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingAction === `resend-${activePacket.id}`}
                  onClick={() => void resendEmail(activePacket.id)}
                >
                  <Mail className="size-4" />
                  Resend email
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                disabled={pendingAction === `copy-${activePacket.id}`}
                onClick={() => void copySignLink(activePacket.id)}
              >
                <Copy className="size-4" />
                Copy link
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2">
          {latestRequests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{request.document.name}</p>
                  <Badge variant="secondary">
                    {onboardingDocumentTypeLabels[request.document.document_type]}
                  </Badge>
                  <Badge variant={request.status === 'signed' ? 'success' : 'warning'}>
                    {request.status === 'signed' ? 'Signed' : 'Pending'}
                  </Badge>
                </div>
                {request.signed_at ? (
                  <p className="text-muted-foreground text-xs">
                    Signed {formatOnboardingSignDate(request.signed_at)}
                    {request.signer_name ? ` by ${request.signer_name}` : ''}
                  </p>
                ) : null}
              </div>
              {request.signed_pdf_storage_path && summary.signedPdfUrls[request.id] ? (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={summary.signedPdfUrls[request.id]!}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="size-4" />
                    Download
                  </a>
                </Button>
              ) : null}
            </div>
          ))}
        </div>

        <Button asChild variant="outline" className="w-fit">
          <Link href={`/clients?onboard=1`}>
            <ClipboardCheck className="size-4" />
            Send more documents
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
