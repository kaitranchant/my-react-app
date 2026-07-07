import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { uploadClientCompletedOnboardingDocument } from '@/lib/onboarding-client-document-upload'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'You must be signed in.' },
      { status: 401 }
    )
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { success: false, error: 'Uploads are temporarily unavailable.' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not read the uploaded PDF.' },
      { status: 400 }
    )
  }

  const file = formData.get('file')
  const clientId = formData.get('clientId')
  const documentId = formData.get('documentId')
  const signerName = formData.get('signerName')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: 'No PDF provided.' },
      { status: 400 }
    )
  }

  if (typeof clientId !== 'string' || typeof documentId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Client and document are required.' },
      { status: 400 }
    )
  }

  const result = await uploadClientCompletedOnboardingDocument({
    supabase,
    admin,
    coachId: user.id,
    file,
    values: {
      clientId,
      documentId,
      signerName: typeof signerName === 'string' ? signerName : undefined,
    },
  })

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  return NextResponse.json(result)
}
