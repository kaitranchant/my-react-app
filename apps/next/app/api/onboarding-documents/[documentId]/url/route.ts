import { NextResponse } from 'next/server'

import { createOnboardingDocumentSignedUrl } from '@/lib/onboarding-documents'
import { createClient } from '@/lib/supabase/server'

async function getCoachOnboardingDocumentSignedUrl(documentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.', status: 401 as const }
  }

  const { data: document, error } = await supabase
    .from('coach_onboarding_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !document) {
    return { error: 'Document not found.', status: 404 as const }
  }

  const signedUrl = await createOnboardingDocumentSignedUrl(
    supabase,
    document.storage_path
  )

  if (!signedUrl) {
    return { error: 'Could not open document.', status: 500 as const }
  }

  return { url: signedUrl }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params
  const result = await getCoachOnboardingDocumentSignedUrl(documentId)

  if ('error' in result) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: result.status }
    )
  }

  return NextResponse.json({ success: true, url: result.url })
}
