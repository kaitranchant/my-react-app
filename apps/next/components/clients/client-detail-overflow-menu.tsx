'use client'

import * as React from 'react'
import { FileText, ClipboardPen, MoreVertical, UserMinus, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ClientOnboardingDocumentsPanel } from '@/components/clients/client-onboarding-documents-panel'
import { ClientAssessmentNotesPanel } from '@/components/clients/client-assessment-notes-panel'
import { MobileKeyboardReserve } from '@/components/mobile-keyboard/mobile-keyboard'
import { useClientGymShareActions } from '@/components/gym/client-gym-share-toggle'
import type { ClientOnboardingDocumentsSummary } from '@/lib/onboarding-data'
import type { Client, Gym } from 'app/types/database'

type ClientDetailOverflowMenuProps = {
  client: Pick<Client, 'id' | 'gym_id' | 'email'>
  clientName: string
  initialAssessmentNotes: string | null
  onboardingDocuments: ClientOnboardingDocumentsSummary
  gyms?: Pick<Gym, 'id' | 'name'>[]
  isPrimaryCoach?: boolean
}

export function ClientDetailOverflowMenu({
  client,
  clientName,
  initialAssessmentNotes,
  onboardingDocuments,
  gyms = [],
  isPrimaryCoach = false,
}: ClientDetailOverflowMenuProps) {
  const [documentsOpen, setDocumentsOpen] = React.useState(false)
  const [assessmentNotesOpen, setAssessmentNotesOpen] = React.useState(false)
  const showGymActions = isPrimaryCoach && gyms.length > 0
  const { memberGym, pendingGymId, addToGym, removeFromGym } =
    useClientGymShareActions(client, gyms)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={showGymActions && pendingGymId !== null}
          >
            <MoreVertical className="size-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDocumentsOpen(true)}>
            <FileText className="size-4" />
            Onboarding documents
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAssessmentNotesOpen(true)}>
            <ClipboardPen className="size-4" />
            Assessment notes
          </DropdownMenuItem>
          {showGymActions ? (
            <>
              <DropdownMenuSeparator />
              {memberGym ? (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={pendingGymId !== null}
                  onSelect={removeFromGym}
                >
                  <UserMinus className="size-4" />
                  {pendingGymId === 'remove'
                    ? 'Saving…'
                    : `Remove from ${memberGym.name}`}
                </DropdownMenuItem>
              ) : (
                gyms.map((gym) => (
                  <DropdownMenuItem
                    key={gym.id}
                    disabled={pendingGymId !== null}
                    onSelect={() => addToGym(gym.id)}
                  >
                    <UserPlus className="size-4" />
                    {pendingGymId === gym.id ? 'Saving…' : `Add to ${gym.name}`}
                  </DropdownMenuItem>
                ))
              )}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Onboarding documents</SheetTitle>
            <SheetDescription>
              PAR-Q, liability, and other signed onboarding documents for{' '}
              {clientName}.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ClientOnboardingDocumentsPanel
              clientId={client.id}
              clientName={clientName}
              clientEmail={client.email}
              summary={onboardingDocuments}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={assessmentNotesOpen} onOpenChange={setAssessmentNotesOpen}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b">
            <SheetTitle>Assessment notes</SheetTitle>
            <SheetDescription>
              Observations from {clientName}&apos;s initial assessment.
            </SheetDescription>
          </SheetHeader>
          <div
            data-nested-keyboard-scroll
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
          >
            <ClientAssessmentNotesPanel
              clientId={client.id}
              clientName={clientName}
              initialNotes={initialAssessmentNotes}
            />
            <MobileKeyboardReserve />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
