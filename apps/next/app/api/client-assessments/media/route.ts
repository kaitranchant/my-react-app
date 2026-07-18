import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import {
  deleteAssessmentMedia,
  uploadAssessmentMedia,
} from '@/app/(dashboard)/clients/assessment-actions'
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not read the uploaded file.' },
      { status: 400 }
    )
  }

  const clientId = formData.get('clientId')
  const assessmentId = formData.get('assessmentId')
  const resultId = formData.get('resultId')

  if (
    typeof clientId !== 'string' ||
    typeof assessmentId !== 'string' ||
    typeof resultId !== 'string'
  ) {
    return NextResponse.json(
      { success: false, error: 'Client, assessment, and result are required.' },
      { status: 400 }
    )
  }

  const result = await uploadAssessmentMedia({
    clientId,
    assessmentId,
    resultId,
    formData,
  })

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  revalidatePath(`/clients/${clientId}`)
  return NextResponse.json(result)
}

export async function DELETE(request: Request) {
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

  let body: { mediaId?: string }
  try {
    body = (await request.json()) as { mediaId?: string }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  if (!body.mediaId) {
    return NextResponse.json(
      { success: false, error: 'Media id is required.' },
      { status: 400 }
    )
  }

  const result = await deleteAssessmentMedia(body.mediaId)
  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  revalidatePath(`/clients/${result.data.clientId}`)
  return NextResponse.json(result)
}
