'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Check,
  Circle,
  ClipboardPen,
  FileText,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { createClientRecord } from '@/app/(dashboard)/clients/actions'
import {
  createOnboardingPacket,
  fetchClientOnboardingCompletion,
  fetchClientsForOnboarding,
  fetchOnboardingTemplatesForCoach,
  getOnboardingSignSession,
} from '@/app/(dashboard)/clients/onboarding-actions'
import { DocumentSigningFlow } from '@/components/onboarding/document-signing-flow'
import { OnboardingDocumentsStep } from '@/components/clients/onboarding-documents-step'
import { ClientAssessmentEditor } from '@/components/clients/assessments/client-assessment-editor'
import type { DeferredAssessmentDraft } from '@/components/clients/assessments/client-assessment-editor'
import { saveClientAssessment } from '@/app/(dashboard)/clients/assessment-actions'
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
import {
  getDefaultOnboardingDocumentSelections,
} from '@/lib/onboarding-documents'

type OnboardClientDialogProps = {
  trigger?: React.ReactNode
  gyms?: { id: string; name: string }[]
  requireGymMembership?: boolean
}

type ClientOption = {
  id: string
  full_name: string
  email: string | null
  status: string
}

type OnboardStepId = 'clientDetails' | 'documents' | 'assessmentNotes'

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
    title: 'Onboarding documents',
    description: 'Fill forms, collect signatures, or upload completed copies.',
    icon: FileText,
  },
  {
    id: 'assessmentNotes',
    title: 'Assessment notes',
    description: 'Score movements, capture notes, and attach media.',
    icon: ClipboardPen,
  },
]

export function OnboardClientDialog({
  trigger,
  gyms = [],
  requireGymMembership = false,
}: OnboardClientDialogProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scopeParam = searchParams.get('scope')
  const initialFormDefaults = React.useMemo(() => {
    if (!requireGymMembership || gyms.length === 0) {
      return onboardClientDefaults
    }

    const gymIds = new Set(gyms.map((gym) => gym.id))
    const gymId =
      scopeParam && gymIds.has(scopeParam) ? scopeParam : gyms[0]?.id ?? 'none'

    return { ...onboardClientDefaults, gymId }
  }, [gyms, requireGymMembership, scopeParam])
  const handledShortcutRef = React.useRef(false)
  const prefillClientIdRef = React.useRef<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [activeStep, setActiveStep] = React.useState<OnboardStepId | null>(null)
  const [completedSteps, setCompletedSteps] = React.useState<
    Record<OnboardStepId, boolean>
  >({
    clientDetails: false,
    documents: false,
    assessmentNotes: false,
  })
  const [clientMode, setClientMode] = React.useState<'new' | 'existing'>('new')
  const [clients, setClients] = React.useState<ClientOption[]>([])
  const [documents, setDocuments] = React.useState<CoachOnboardingDocument[]>([])
  const [existingClientId, setExistingClientId] = React.useState('')
  const [resolvedClientId, setResolvedClientId] = React.useState<string | null>(null)
  const [resolvedClientName, setResolvedClientName] = React.useState('')
  const [selectedFillDocumentIds, setSelectedFillDocumentIds] = React.useState<string[]>(
    []
  )
  const [selectedSignatureDocumentIds, setSelectedSignatureDocumentIds] =
    React.useState<string[]>([])
  const [completedDocumentIds, setCompletedDocumentIds] = React.useState<string[]>([])
  const [deliveryMethod, setDeliveryMethod] = React.useState<'email' | 'in_person'>(
    'in_person'
  )
  const [pendingAvatar, setPendingAvatar] = React.useState<File | null>(null)
  const [pendingPresetId, setPendingPresetId] =
    React.useState<ClientAvatarPresetId | null>(null)
  const [signingSession, setSigningSession] =
    React.useState<InPersonSigningSession | null>(null)
  const [inPersonSigning, setInPersonSigning] = React.useState(false)
  const [assessmentSaved, setAssessmentSaved] = React.useState(false)
  const [pendingAssessmentDraft, setPendingAssessmentDraft] =
    React.useState<DeferredAssessmentDraft | null>(null)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: initialFormDefaults,
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
    prefillClientIdRef.current = searchParams.get('onboardClientId')
    setOpen(true)

    const params = new URLSearchParams(searchParams.toString())
    params.delete('onboard')
    params.delete('onboardClientId')
    const query = params.toString()
    router.replace(query ? `/clients?${query}` : '/clients', { scroll: false })
  }, [router, searchParams])

  React.useEffect(() => {
    if (!open) {
      setLoading(false)
      setLoadError(null)
      setActiveStep(null)
      setCompletedSteps({
        clientDetails: false,
        documents: false,
        assessmentNotes: false,
      })
      setClientMode('new')
      setExistingClientId('')
      setResolvedClientId(null)
      setResolvedClientName('')
      setSelectedFillDocumentIds([])
      setSelectedSignatureDocumentIds([])
      setCompletedDocumentIds([])
      setDeliveryMethod('in_person')
      setPendingAvatar(null)
      setPendingPresetId(null)
      setSigningSession(null)
      setInPersonSigning(false)
      setAssessmentSaved(false)
      setPendingAssessmentDraft(null)
      form.reset(initialFormDefaults)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)

    Promise.all([fetchClientsForOnboarding(), fetchOnboardingTemplatesForCoach()])
      .then(([clientRows, documentRows]) => {
        if (cancelled) return
        setClients(clientRows)
        setDocuments(documentRows)
        const defaults = getDefaultOnboardingDocumentSelections(documentRows)
        setSelectedFillDocumentIds(defaults.fillIds)
        setSelectedSignatureDocumentIds(defaults.signatureIds)

        const prefillClientId = prefillClientIdRef.current
        prefillClientIdRef.current = null
        if (prefillClientId) {
          const match = clientRows.find((client) => client.id === prefillClientId)
          if (match) {
            setClientMode('existing')
            setExistingClientId(prefillClientId)
            setResolvedClientId(prefillClientId)
            setResolvedClientName(match.full_name)
            setCompletedSteps((current) => ({ ...current, clientDetails: true }))
            setActiveStep(
              documentRows.length > 0 ? 'documents' : 'assessmentNotes'
            )
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Could not load onboarding data. Please try again.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when dialog opens
  }, [open])

  React.useEffect(() => {
    if (!open || !resolvedClientId) return

    let cancelled = false
    void fetchClientOnboardingCompletion(resolvedClientId).then((result) => {
      if (!cancelled) {
        setCompletedDocumentIds(result.completedDocumentIds)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, resolvedClientId])

  async function refreshCompletedDocuments() {
    if (!resolvedClientId) return
    const result = await fetchClientOnboardingCompletion(resolvedClientId)
    setCompletedDocumentIds(result.completedDocumentIds)
    router.refresh()
  }

  function markStepComplete(stepId: OnboardStepId) {
    setCompletedSteps((current) => ({ ...current, [stepId]: true }))
  }

  function goToAssessmentNotesStep() {
    markStepComplete('documents')
    setInPersonSigning(false)
    setActiveStep('assessmentNotes')
  }

  function goToNextStep(afterStep: OnboardStepId) {
    if (afterStep === 'clientDetails' && canSkipDocuments) {
      markStepComplete('documents')
      setActiveStep('assessmentNotes')
      return
    }
    setActiveStep(null)
  }

  function toggleFillDocument(documentId: string, checked: boolean) {
    setSelectedFillDocumentIds((current) =>
      checked ? [...current, documentId] : current.filter((id) => id !== documentId)
    )
  }

  function toggleSignatureDocument(documentId: string, checked: boolean) {
    setSelectedSignatureDocumentIds((current) =>
      checked ? [...current, documentId] : current.filter((id) => id !== documentId)
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

  async function resolveClientForAssessment(): Promise<string | null> {
    if (clientMode === 'existing') {
      if (!existingClientId) {
        toast.error('Select a client.')
        return null
      }
      setResolvedClientId(existingClientId)
      setResolvedClientName(selectedClient?.full_name ?? 'Client')
      markStepComplete('clientDetails')
      return existingClientId
    }

    const fullName = form.getValues('fullName')?.trim()
    if (!fullName) {
      toast.error('Enter a client name.')
      return null
    }

    const valid = await form.trigger(['fullName', 'email', 'phone', 'gymId'])
    if (!valid) return null

    setPending(true)
    const values = form.getValues()
    const createResult = await createClientRecord({
      ...values,
      status: 'active',
    })
    setPending(false)

    if (!createResult.success) {
      toast.error(createResult.error)
      return null
    }

    await savePendingAvatar(createResult.clientId)
    setResolvedClientId(createResult.clientId)
    setResolvedClientName(values.fullName.trim())
    markStepComplete('clientDetails')
    return createResult.clientId
  }

  async function flushPendingAssessment(clientId: string) {
    if (!pendingAssessmentDraft) return true
    // Already written to the DB — do not create a second session.
    if (pendingAssessmentDraft.assessmentId) return true

    setPending(true)
    const result = await saveClientAssessment({
      clientId,
      ...pendingAssessmentDraft,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return false
    }

    // Keep the draft so returning to Assessment notes restores scored tests.
    setPendingAssessmentDraft({
      ...pendingAssessmentDraft,
      assessmentId: result.data.assessmentId,
      results: pendingAssessmentDraft.results.map((row) => ({
        ...row,
        clientKey:
          result.data.resultIdsByClientKey[row.clientKey] ?? row.clientKey,
      })),
    })
    markStepComplete('assessmentNotes')
    setAssessmentSaved(true)
    toast.success('Assessment saved')
    return true
  }

  async function completeClientDetailsStep() {
    const clientId = await resolveClientForAssessment()
    if (!clientId) return false

    const flushed = await flushPendingAssessment(clientId)
    if (!flushed) return false

    goToNextStep('clientDetails')
    return true
  }

  async function completeDocumentsStep() {
    if (!documentsAvailable) {
      markStepComplete('documents')
      setActiveStep('assessmentNotes')
      return true
    }

    markStepComplete('documents')
    setActiveStep('assessmentNotes')
    return true
  }

  function getPendingSignatureDocumentIds() {
    return selectedSignatureDocumentIds.filter(
      (documentId) => !completedDocumentIds.includes(documentId)
    )
  }

  async function startSignatureCollection(method: 'email' | 'in_person') {
    if (!documentsAvailable) {
      if (!resolvedClientId) {
        toast.error('Complete client details first.')
        setActiveStep('clientDetails')
        return
      }
      goToAssessmentNotesStep()
      return
    }

    const signatureDocumentIds = getPendingSignatureDocumentIds()
    if (signatureDocumentIds.length === 0) {
      toast.error('Select at least one document that still needs a signature.')
      return
    }

    const clientId = resolvedClientId
    if (!clientId) {
      toast.error('Complete client details first.')
      setActiveStep('clientDetails')
      return
    }

    const signerEmail = resolveSignerEmail()
    if (method === 'email' && !signerEmail) {
      toast.error('Add an email address before sending documents by email.')
      return
    }

    setDeliveryMethod(method)
    setPending(true)
    const result = await createOnboardingPacket({
      clientId,
      documentIds: signatureDocumentIds,
      deliveryMethod: method,
      signerEmail: method === 'email' ? signerEmail : undefined,
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

    if (method === 'email') {
      toast.success('Onboarding documents sent.')
      void refreshCompletedDocuments()
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
    void refreshCompletedDocuments()
    goToAssessmentNotesStep()
    toast.success('Documents signed.')
  }

  async function finishOnboarding(markAssessmentComplete: boolean) {
    const clientId = resolvedClientId
    if (!clientId) {
      toast.error('Complete client details first.')
      setActiveStep('clientDetails')
      return
    }

    if (pendingAssessmentDraft && !pendingAssessmentDraft.assessmentId) {
      const flushed = await flushPendingAssessment(clientId)
      if (!flushed) return
    }

    if (markAssessmentComplete || assessmentSaved) {
      markStepComplete('assessmentNotes')
      setAssessmentSaved(true)
    }

    toast.success('Client onboarded successfully.')
    setOpen(false)
    router.push(`/clients/${clientId}`)
    router.refresh()
  }

  function handleAssessmentSaved(
    assessmentId: string,
    draft: DeferredAssessmentDraft
  ) {
    setPendingAssessmentDraft({ ...draft, assessmentId })
    markStepComplete('assessmentNotes')
    setAssessmentSaved(true)
    setActiveStep(null)
  }

  function handleDeferredAssessmentSave(draft: DeferredAssessmentDraft) {
    setPendingAssessmentDraft(draft)
    markStepComplete('assessmentNotes')
    setAssessmentSaved(true)
    setActiveStep(null)
    toast.success('Assessment saved. Add client details to finish onboarding.')
  }

  function handleChecklistStepClick(stepId: OnboardStepId) {
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
      if (completedDocumentIds.length > 0) {
        return `${completedDocumentIds.length} document${completedDocumentIds.length === 1 ? '' : 's'} on file`
      }
      const count =
        selectedFillDocumentIds.length + selectedSignatureDocumentIds.length
      return `${count} document${count === 1 ? '' : 's'} selected`
    }
    if (stepId === 'assessmentNotes' && completedSteps.assessmentNotes) {
      return assessmentSaved ? 'Assessment saved' : 'Assessment notes'
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
            : activeStep === 'documents' || activeStep === 'assessmentNotes'
              ? 'max-h-[90vh] max-w-2xl overflow-y-auto'
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
        ) : loadError ? (
          <div className="grid gap-3">
            <p className="text-destructive text-sm">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                setLoadError(null)
                setLoading(true)
                void Promise.all([
                  fetchClientsForOnboarding(),
                  fetchOnboardingTemplatesForCoach(),
                ])
                  .then(([clientRows, documentRows]) => {
                    setClients(clientRows)
                    setDocuments(documentRows)
                    const defaults = getDefaultOnboardingDocumentSelections(documentRows)
                    setSelectedFillDocumentIds(defaults.fillIds)
                    setSelectedSignatureDocumentIds(defaults.signatureIds)
                  })
                  .catch(() => {
                    setLoadError('Could not load onboarding data. Please try again.')
                  })
                  .finally(() => setLoading(false))
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid gap-5">
            {!inPersonSigning && activeStep === null ? (
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

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => handleChecklistStepClick(step.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border bg-background/80 p-3 text-left transition-colors',
                        isActive && 'border-brand/30 ring-brand/20 ring-1',
                        done && 'border-brand/20 bg-brand/5'
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

            {!inPersonSigning && activeStep !== null ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {checklistSteps.find((step) => step.id === activeStep)?.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Step{' '}
                    {checklistSteps.findIndex((step) => step.id === activeStep) + 1} of{' '}
                    {checklistSteps.length}
                    {resolvedClientName ? ` · ${resolvedClientName}` : ''}
                  </p>
                </div>
                <p className="text-muted-foreground shrink-0 text-xs">
                  {completedCount}/{checklistSteps.length} done
                </p>
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
                      <ClientGymField
                        control={form.control}
                        name="gymId"
                        gyms={gyms}
                        requireGymMembership={requireGymMembership}
                      />
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
                  <OnboardingDocumentsStep
                    clientId={resolvedClientId}
                    clientName={resolvedClientName}
                    clientEmail={resolveSignerEmail() || null}
                    documents={documents}
                    completedDocumentIds={completedDocumentIds}
                    selectedFillIds={selectedFillDocumentIds}
                    selectedSignatureIds={selectedSignatureDocumentIds}
                    onToggleFill={toggleFillDocument}
                    onToggleSignature={toggleSignatureDocument}
                    deliveryMethod={deliveryMethod}
                    onDeliveryMethodChange={setDeliveryMethod}
                    onCompletedUpload={() => void refreshCompletedDocuments()}
                    onStartInPersonSigning={() =>
                      void startSignatureCollection('in_person')
                    }
                    onSendEmail={() => void startSignatureCollection('email')}
                    pending={pending}
                  />
                ) : null}

                {activeStep === 'assessmentNotes' ? (
                  <ClientAssessmentEditor
                    key={
                      pendingAssessmentDraft
                        ? `draft-${pendingAssessmentDraft.assessmentId ?? 'pending'}-${pendingAssessmentDraft.assessedAt ?? 'na'}-${pendingAssessmentDraft.results.length}`
                        : resolvedClientId
                          ? `client-${resolvedClientId}-new`
                          : 'new-assessment'
                    }
                    clientId={resolvedClientId ?? ''}
                    clientName={resolvedClientName || 'this client'}
                    source="onboarding"
                    compact
                    initialDraft={pendingAssessmentDraft}
                    onSaved={handleAssessmentSaved}
                    onDeferredSave={handleDeferredAssessmentSave}
                  />
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
                Continue to assessment notes
              </Button>
            ) : null}
            {activeStep === 'assessmentNotes' ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => void finishOnboarding(assessmentSaved)}
              >
                Finish without assessment
              </Button>
            ) : null}
            {!activeStep && resolvedClientId ? (
              <Button
                type="button"
                variant="brand"
                disabled={pending}
                onClick={() => void finishOnboarding(assessmentSaved)}
              >
                {pending ? 'Submitting…' : 'Submit'}
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
