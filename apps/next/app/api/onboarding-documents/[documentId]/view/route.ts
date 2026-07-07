import { NextResponse } from 'next/server'

import { createOnboardingDocumentSignedUrl } from '@/lib/onboarding-documents'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  }

  const { data: document, error } = await supabase
    .from('coach_onboarding_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !document) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  }

  const signedUrl = await createOnboardingDocumentSignedUrl(
    supabase,
    document.storage_path
  )

  if (!signedUrl) {
    return NextResponse.json({ error: 'Could not open document.' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrl)
}
