import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { uploadCoachOnboardingDocumentFile } from '@/lib/onboarding-document-upload'
import { createClient } from '@/lib/supabase/server'
import type { OnboardingDocumentType } from 'app/types/database'

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
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: 'No PDF provided.' },
      { status: 400 }
    )
  }

  const name = formData.get('name')
  const documentType = formData.get('documentType')
  const isDefault = formData.get('isDefault')

  if (typeof name !== 'string' || typeof documentType !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Document name and type are required.' },
      { status: 400 }
    )
  }

  const result = await uploadCoachOnboardingDocumentFile(supabase, user.id, file, {
    name,
    documentType: documentType as OnboardingDocumentType,
    isDefault: isDefault === 'true',
  })

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  revalidatePath('/settings')
  revalidatePath('/clients')
  return NextResponse.json(result)
}
