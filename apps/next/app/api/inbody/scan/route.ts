import { NextResponse } from 'next/server'

import {
  extractInbodyMetricsFromImage,
  getMissingRequiredInbodyFields,
  INBODY_SCAN_IMAGE_MAX_BYTES,
  validateInbodyScanImageFile,
} from '@/lib/inbody-scan-ocr'
import {
  createEmptyInbodyScanValues,
  mergeScannedInbodyValues,
} from '@/lib/inbody-scans'
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
      { success: false, error: 'Could not read the uploaded image.' },
      { status: 400 }
    )
  }

  const clientId = formData.get('clientId')
  if (typeof clientId !== 'string' || !clientId) {
    return NextResponse.json(
      { success: false, error: 'Client not found.' },
      { status: 400 }
    )
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (clientError || !client) {
    return NextResponse.json(
      { success: false, error: 'Client not found.' },
      { status: 404 }
    )
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: 'Choose an image to scan.' },
      { status: 400 }
    )
  }

  const validationError = validateInbodyScanImageFile(file)
  if (validationError) {
    return NextResponse.json(
      { success: false, error: validationError },
      { status: 400 }
    )
  }

  if (file.size > INBODY_SCAN_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: 'Image is too large. Choose a file under 10 MB.',
      },
      { status: 413 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const scanned = await extractInbodyMetricsFromImage(buffer, file.type)
    const values = mergeScannedInbodyValues(
      createEmptyInbodyScanValues(),
      scanned
    )
    const missingRequired = getMissingRequiredInbodyFields(scanned)

    return NextResponse.json({
      success: true,
      values,
      missingRequired,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Could not read metrics from this image.',
      },
      { status: 500 }
    )
  }
}
