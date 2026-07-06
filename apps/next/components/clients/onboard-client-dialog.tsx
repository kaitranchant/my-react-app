'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Check,
  Circle,
  ClipboardCheck,
  FilePenLine,
  FileText,
  Mail,
  Sparkles,
  TabletSmartphone,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { createClientRecord } from '@/app/(dashboard)/clients/actions'
import {
  createOnboardingPacket,
  fetchClientsForOnboarding,
  fetchOnboardingTemplatesForCoach,
  getOnboardingSignSession,
} from '@/app/(dashboard)/clients/onboarding-actions'
import { DocumentSigningFlow } from '@/components/onboarding/document-signing-flow'
import {
  setClientAvatarPreset,
  uploadPendingClientAvatar,
} from '@/app/(dashboard)/clients/avatar-actions'
import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { ClientCoachingTypeField } from '@/components/clients/client-coaching-type-field'
import { ClientGymField } from '@/components/clients/client-gym-field'
import { ClientLeaderboardProfileFields } from '@/components/clients/client-leaderboard-profile-fields'
import type { ClientAvatarPresetId } from '@/lib/client-avatar-presets'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  clientFormDefaults,
  clientFormSchema,
  type ClientFormValues,
} from '@/lib/validations/client'
import type { CoachOnboardingDocument } from 'app/types/database'

type OnboardClientDialogProps = {
  trigger?: React.ReactNode
  gyms?: { id: string; name: string }[]
}

type ClientOption = {
  id: string
  full_name: string
  email: string | null
  status: string
}

type OnboardStepId = 'clientDetails' | 'documents' | 'signing'

type InPersonSigningSession = Extract<
  Awaited<ReturnType<typeof getOnboardingSignSession>>,
  { success: true; mode: 'coach' }
>

const onboardClientDefaults: ClientFormValues = {
  ...clientFormDefaults,
  status: 'active',
}

const checklistSteps: Array<{
  id: OnboardStepId
  title: string
  description: string
  icon: typeof UserPlus
}> = [
  {
    id: 'clientDetails',
    title: 'Client details',
    description: 'Add their name, contact info, and coaching preferences.',
    icon: UserPlus,
  },
  {
    id: 'documents',
    title: 'Select documents',
    description: 'Choose PAR-Q, liability waiver, and other forms to collect.',
    icon: FileText,
  },
  {
    id: 'signing',
    title: 'Collect signatures',
    description: 'Sign in person on this device or send a link by email.',
    icon: FilePenLine,
  },
]

export function OnboardClientDialog({
  trigger,
  gyms = [],
}: OnboardClientDialogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const handledShortcutRef = React.useRef(false)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [activeStep, setActiveStep] = React.useState<OnboardStepId | null>(null)
  const [completedSteps, setCompletedSteps] = React.useState<
    Record<OnboardStepId, boolean>
  >({
    clientDetails: false,
    documents: false,
    signing: false,
  })
  const [clientMode, setClientMode] = React.useState<'new' | 'existing'>('new')
  const [clients, setClients] = React.useState<ClientOption[]>([])
  const [documents, setDocuments] = React.useState<CoachOnboardingDocument[]>([])
  const [existingClientId, setExistingClientId] = React.useState('')
  const [resolvedClientId, setResolvedClientId] = React.useState<string | null>(null)
  const [resolvedClientName, setResolvedClientName] = React.useState('')
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([])
  const [deliveryMethod, setDeliveryMethod] = React.useState<'email' | 'in_person'>(
    'in_person'
  )
  const [pendingAvatar, setPendingAvatar] = React.useState<File | null>(null)
  const [pendingPresetId, setPendingPresetId] =
    React.useState<ClientAvatarPresetId | null>(null)
  const [signingSession, setSigningSession] =
    React.useState<InPersonSigningSession | null>(null)
  const [inPersonSigning, setInPersonSigning] = React.useState(false)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: onboardClientDefaults,
  })

  const selectedClient = clients.find((client) => client.id === existingClientId)
  const displayName = form.watch('fullName')
  const clientEmail = form.watch('email')

  const completedCount = checklistSteps.filter((step) => completedSteps[step.id]).length
  const documentsAvailable = documents.length > 0
  const canSkipDocuments = !documentsAvailable

  React.useEffect(() => {
    if (handledShortcutRef.current) return
    if (searchParams.get('onboard') !== '1') return

    handledShortcutRef.current = true
    setOpen(true)

    const params = new URLSearchParams(searchParams.toString())
    params.delete('onboard')
    const query = params.toString()
    router.replace(query ? `/clients?${query}` : '/clients', { scroll: false })
  }, [router, searchParams])

  React.useEffect(() => {
    if (!open) {
      setActiveStep(null)
      setCompletedSteps({
        clientDetails: false,
        documents: false,
        signing: false,
      })
      setClientMode('new')
      setExistingClientId('')
      setResolvedClientId(null)
      setResolvedClientName('')
      setSelectedDocumentIds([])
      setDeliveryMethod('in_person')
      setPendingAvatar(null)
      setPendingPresetId(null)
      setSigningSession(null)
      setInPersonSigning(false)
      form.reset(onboardClientDefaults)
      return
    }

    let cancelled = false
    setLoading(true)

    Promise.all([fetchClientsForOnboarding(), fetchOnboardingTemplatesForCoach()])
      .then(([clientRows, documentRows]) => {
        if (cancelled) return
        setClients(clientRows)
        setDocuments(documentRows)
        setSelectedDocumentIds(
          documentRows
            .filter((document) => document.is_default)
            .map((document) => document.id)
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, form])

  function markStepComplete(stepId: OnboardStepId) {
    setCompletedSteps((current) => ({ ...current, [stepId]: true }))
  }

  function goToNextStep(afterStep: OnboardStepId) {
    if (afterStep === 'clientDetails' && canSkipDocuments) {
      markStepComplete('documents')
    }
    setActiveStep(null)
  }

  function toggleDocument(documentId: string, checked: boolean) {
    setSelectedDocumentIds((current) =>
      checked
        ? [...current, documentId]
        : current.filter((id) => id !== documentId)
    )
  }

  async function savePendingAvatar(clientId: string) {
    if (pendingPresetId) {
      const result = await setClientAvatarPreset(clientId, pendingPresetId)
      setPendingPresetId(null)
      if (!result.success) {
        toast.error(result.error)
      }
      return
    }

    if (!pendingAvatar) return
    const formData = new FormData()
    formData.set('file', pendingAvatar)
    const result = await uploadPendingClientAvatar(clientId, formData)
    setPendingAvatar(null)
    if (!result.success) {
      toast.error(result.error)
    }
  }

  function resolveSignerEmail() {
    if (resolvedClientId && clientMode === 'existing') {
      return selectedClient?.email?.trim() || ''
    }
    if (resolvedClientId) {
      return clientEmail?.trim() || ''
    }
    if (clientMode === 'existing') {
      return selectedClient?.email?.trim() || ''
    }
    return clientEmail?.trim() || ''
  }

  async function completeClientDetailsStep() {
    if (clientMode === 'existing') {
      if (!existingClientId) {
        toast.error('Select a client.')
        return false
      }
      setResolvedClientId(existingClientId)
      setResolvedClientName(selectedClient?.full_name ?? 'Client')
      markStepComplete('clientDetails')
      goToNextStep('clientDetails')
      return true
    }

    const valid = await form.trigger()
    if (!valid) return false

    setPending(true)
    const values = form.getValues()
    const createResult = await createClientRecord({
      ...values,
      status: 'active',
    })
    setPending(false)

    if (!createResult.success) {
      toast.error(createResult.error)
      return false
    }

    await savePendingAvatar(createResult.clientId)
    setResolvedClientId(createResult.clientId)
    setResolvedClientName(values.fullName.trim())
    markStepComplete('clientDetails')
    goToNextStep('clientDetails')
    return true
  }

  async function completeDocumentsStep() {
    if (!documentsAvailable) {
      markStepComplete('documents')
      goToNextStep('documents')
      return true
    }

    if (selectedDocumentIds.length === 0) {
      toast.error('Select at least one document.')
      return false
    }

    markStepComplete('documents')
    goToNextStep('documents')
    return true
  }

  async function completeSigningStep() {
    if (!documentsAvailable) {
      toast.success(`${resolvedClientName || 'Client'} added. Upload document templates in Settings to collect signatures later.`)
      markStepComplete('signing')
      setOpen(false)
      router.refresh()
      return
    }

    if (selectedDocumentIds.length === 0) {
      toast.error('Select at least one document.')
      setActiveStep('documents')
      setCompletedSteps((current) => ({ ...current, documents: false }))
      return
    }

    const clientId = resolvedClientId
    if (!clientId) {
      toast.error('Complete client details first.')
      setActiveStep('clientDetails')
      return
    }

    const signerEmail = resolveSignerEmail()
    if (deliveryMethod === 'email' && !signerEmail) {
      toast.error('Add an email address before sending documents by email.')
      return
    }

    setPending(true)
    const result = await createOnboardingPacket({
      clientId,
      documentIds: selectedDocumentIds,
      deliveryMethod,
      signerEmail: deliveryMethod === 'email' ? signerEmail : undefined,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      if (result.signUrl) {
        await navigator.clipboard.writeText(result.signUrl)
        toast.message('Sign link copied to clipboard.')
      }
      return
    }

    if (deliveryMethod === 'email') {
      markStepComplete('signing')
      toast.success('Onboarding documents sent.')
      setOpen(false)
      router.refresh()
      return
    }

    const session = await getOnboardingSignSession({ packetId: result.packetId })
    if (!session.success) {
      toast.error(session.error)
      return
    }

    setSigningSession(session as InPersonSigningSession)
    setInPersonSigning(true)
  }

  function handleSigningComplete() {
    markStepComplete('signing')
    toast.success('Client onboarded successfully.')
    setOpen(false)
    router.refresh()
  }

  function handleChecklistStepClick(stepId: OnboardStepId) {
    if (stepId === 'documents' && !completedSteps.clientDetails) return
    if (stepId === 'signing' && !completedSteps.clientDetails) return
    if (stepId === 'signing' && documentsAvailable && !completedSteps.documents) return
    if (activeStep === stepId) {
      setActiveStep(null)
      return
    }
    setActiveStep(stepId)
    setInPersonSigning(false)
  }

  function getStepLabel(stepId: OnboardStepId) {
    if (stepId === 'clientDetails' && completedSteps.clientDetails) {
      return resolvedClientName ? `Client: ${resolvedClientName}` : 'Client details saved'
    }
    if (stepId === 'documents' && completedSteps.documents) {
      if (!documentsAvailable) return 'Documents skipped (no templates)'
      const count = selectedDocumentIds.length
      return `${count} document${count === 1 ? '' : 's'} selected`
    }
    if (stepId === 'signing' && completedSteps.signing) {
      return deliveryMethod === 'email' ? 'Documents sent by email' : 'Documents signed'
    }
    return checklistSteps.find((step) => step.id === stepId)?.title ?? ''
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={
          inPersonSigning
            ? 'max-h-[90vh] max-w-3xl overflow-y-auto'
            : 'max-h-[90vh] max-w-xl overflow-y-auto'
        }
      >
        <DialogHeader>
          <DialogTitle>Onboard client</DialogTitle>
          <DialogDescription>
            Work through each step to add a client and collect signed documents.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="grid gap-5">
            {!inPersonSigning ? (
              <div className="border-brand/20 bg-brand/5 space-y-2 rounded-xl border p-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="bg-brand/10 text-brand flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Sparkles className="size-4" />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {completedCount} of {checklistSteps.length} steps complete
                  </p>
                </div>
                {checklistSteps.map((step) => {
                  const done = completedSteps[step.id]
                  const isActive = activeStep === step.id
                  const Icon = step.icon
                  const isLocked =
                    (step.id === 'documents' && !completedSteps.clientDetails) ||
                    (step.id === 'signing' &&
                      (!completedSteps.clientDetails ||
                        (documentsAvailable && !completedSteps.documents)))

                  return (
                    <button
                      key={step.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleChecklistStepClick(step.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border bg-background/80 p-3 text-left transition-colors',
                        isActive && 'border-brand/30 ring-brand/20 ring-1',
                        done && 'border-brand/20 bg-brand/5',
                        isLocked && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                          done
                            ? 'bg-brand text-brand-foreground'
                            : isActive
                              ? 'bg-brand/15 text-brand'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {done ? (
                          <Check className="size-3.5" aria-hidden />
                        ) : (
                          <Circle className="size-3.5" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Icon className="text-muted-foreground size-3.5 shrink-0" />
                          <p className="text-sm font-semibold">{getStepLabel(step.id)}</p>
                        </div>
                        {!done ? (
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {step.description}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {inPersonSigning && signingSession && resolvedClientId ? (
              <DocumentSigningFlow
                clientId={resolvedClientId}
                preview={signingSession.preview}
                documents={signingSession.documents}
                packetId={signingSession.packetId}
                mode="coach"
                embedded
                onComplete={handleSigningComplete}
              />
            ) : activeStep !== null ? (
              <div className="space-y-4 rounded-xl border p-4">
                {activeStep === 'clientDetails' ? (
              <Tabs
                value={clientMode}
                onValueChange={(value) => setClientMode(value as 'new' | 'existing')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="new" className="gap-1.5">
                    <UserPlus className="size-4" />
                    New client
                  </TabsTrigger>
                  <TabsTrigger value="existing" className="gap-1.5">
                    <Users className="size-4" />
                    Existing client
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="mt-4">
                  <Form {...form}>
                    <div className="grid gap-4">
                      <ClientAvatarUpload
                        name={displayName || 'Client'}
                        onPendingFile={setPendingAvatar}
                        onPendingPreset={setPendingPresetId}
                        selectedPresetId={pendingPresetId}
                        size="sm"
                      />
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jordan Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="jordan@example.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  inputMode="tel"
                                  autoComplete="tel"
                                  placeholder="(555) 123-4567"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <ClientCoachingTypeField
                        control={form.control}
                        name="coachingType"
                      />
                      <ClientGymField control={form.control} name="gymId" gyms={gyms} />
                      <FormField
                        control={form.control}
                        name="goal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goal (optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Build strength for marathon season"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                rows={2}
                                placeholder="Injuries, preferences, context…"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <ClientLeaderboardProfileFields
                        control={form.control}
                        biologicalSexName="biologicalSex"
                        leaderboardOptOutName="leaderboardOptOut"
                      />
                    </div>
                  </Form>
                </TabsContent>

                <TabsContent value="existing" className="mt-4">
                  <div className="grid gap-2">
                    <Label>Client</Label>
                    <Select
                      value={existingClientId}
                      onValueChange={setExistingClientId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.full_name}
                            {client.email ? ` (${client.email})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
                ) : null}

                {activeStep === 'documents' ? (
              documentsAvailable ? (
                <div className="grid gap-3">
                  <Label>Documents to sign</Label>
                  {documents.map((document) => (
                    <label
                      key={document.id}
                      className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocumentIds.includes(document.id)}
                        onChange={(event) =>
                          toggleDocument(document.id, event.target.checked)
                        }
                      />
                      <span>{document.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm">
                    No document templates yet. Upload PAR-Q and liability PDFs in
                    Settings, or finish now to create the client and send documents
                    later.
                  </p>
                  <Button asChild variant="outline" className="w-fit">
                    <Link href="/settings#onboarding">Upload document templates</Link>
                  </Button>
                </div>
              )
                ) : null}

                {activeStep === 'signing' ? (
              <div className="grid gap-4">
                {documentsAvailable ? (
                  <>
                    <div className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
                      <p>
                        <span className="font-medium">
                          {resolvedClientName || 'Client'}
                        </span>
                        {resolveSignerEmail() ? ` · ${resolveSignerEmail()}` : ''}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {selectedDocumentIds.length} document
                        {selectedDocumentIds.length === 1 ? '' : 's'} ready to sign
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label>How should they sign?</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant={deliveryMethod === 'in_person' ? 'brand' : 'outline'}
                          onClick={() => setDeliveryMethod('in_person')}
                        >
                          <TabletSmartphone className="size-4" />
                          Sign in person
                        </Button>
                        <Button
                          type="button"
                          variant={deliveryMethod === 'email' ? 'brand' : 'outline'}
                          onClick={() => setDeliveryMethod('email')}
                        >
                          <Mail className="size-4" />
                          Email link
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Client record is ready. Finish onboarding to add them to your
                    list — you can collect signatures once document templates are
                    uploaded.
                  </p>
                )}
              </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}

        {!inPersonSigning && !loading ? (
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => (activeStep ? setActiveStep(null) : setOpen(false))}
            >
              {activeStep ? 'Back' : 'Cancel'}
            </Button>
            {activeStep === 'clientDetails' ? (
              <Button
                type="button"
                variant="brand"
                disabled={pending}
                onClick={() => void completeClientDetailsStep()}
              >
                Save & continue
              </Button>
            ) : null}
            {activeStep === 'documents' ? (
              <Button
                type="button"
                variant="brand"
                onClick={() => void completeDocumentsStep()}
              >
                Continue
              </Button>
            ) : null}
            {activeStep === 'signing' ? (
              <Button
                type="button"
                variant="brand"
                disabled={pending}
                onClick={() => void completeSigningStep()}
              >
                <ClipboardCheck className="size-4" />
                {documentsAvailable
                  ? deliveryMethod === 'email'
                    ? 'Send documents'
                    : 'Start signing'
                  : 'Finish onboarding'}
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
