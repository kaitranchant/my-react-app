'use server'

import { revalidatePath } from 'next/cache'

import {
  attachSignedUrlsToPhotos,
  isProgressPhotoPose,
  progressPhotoStoragePath,
  PROGRESS_PHOTOS_BUCKET,
  PROGRESS_PHOTO_MAX_UPLOAD_BYTES,
} from '@/lib/progress-photos'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import type {
  ClientProgressPhoto,
  ClientProgressPhotoWithUrl,
  ProgressPhotoPose,
} from 'app/types/database'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export type ProgressPhotoUploadResult = ActionResult<ClientProgressPhotoWithUrl>

async function revalidateProgressPhotoPaths(clientId: string) {
  revalidatePath('/portal/check-in')
  revalidatePath('/portal/progress')
  revalidatePath('/portal', 'layout')
  revalidatePath('/check-ins')
  revalidatePath('/progress-photos')
  revalidatePath(`/clients/${clientId}`)
}

export async function uploadClientProgressPhoto(
  checkInId: string,
  pose: ProgressPhotoPose,
  formData: FormData
): Promise<ProgressPhotoUploadResult> {
  if (!isProgressPhotoPose(pose)) {
    return { success: false, error: 'Invalid photo pose.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No image provided.' }
  }

  if (file.size > PROGRESS_PHOTO_MAX_UPLOAD_BYTES) {
    return { success: false, error: 'Image must be under 2 MB.' }
  }

  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'Invalid image type.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const portalCtx = await getPortalClientContext()
  const client = portalCtx?.client

  if (!client) {
    return { success: false, error: 'Client profile not found.' }
  }

  const { data: checkIn, error: checkInError } = await supabase
    .from('client_check_ins')
    .select('id, client_id, coach_id, check_in_date, reviewed_at, submitted_by')
    .eq('id', checkInId)
    .eq('client_id', client.id)
    .maybeSingle()

  if (checkInError) {
    return { success: false, error: checkInError.message }
  }

  if (!checkIn) {
    return { success: false, error: 'Check-in not found.' }
  }

  if (checkIn.reviewed_at) {
    return { success: false, error: 'This check-in has been reviewed and cannot be edited.' }
  }

  const { data: existingPhoto } = await supabase
    .from('client_progress_photos')
    .select('id, storage_path')
    .eq('check_in_id', checkInId)
    .eq('pose', pose)
    .maybeSingle()

  const photoId = existingPhoto?.id ?? crypto.randomUUID()
  const storagePath =
    existingPhoto?.storage_path ?? progressPhotoStoragePath(client.id, photoId)
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .upload(storagePath, buffer, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    })

  if (uploadError) {
    const message = uploadError.message.toLowerCase()
    if (message.includes('bucket')) {
      return {
        success: false,
        error:
          'Progress photo storage is not set up. Run supabase db push or apply-client-progress-photos.sql.',
      }
    }
    return { success: false, error: uploadError.message }
  }

  const caption = formData.get('caption')
  const captionValue =
    typeof caption === 'string' && caption.trim() ? caption.trim() : null

  let photo: ClientProgressPhoto | null = null

  if (existingPhoto) {
    const { data, error } = await supabase
      .from('client_progress_photos')
      .update({
        caption: captionValue,
        photo_date: checkIn.check_in_date,
      })
      .eq('id', existingPhoto.id)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    photo = data as ClientProgressPhoto
  } else {
    const { data, error } = await supabase
      .from('client_progress_photos')
      .insert({
        id: photoId,
        client_id: client.id,
        coach_id: checkIn.coach_id,
        check_in_id: checkInId,
        photo_date: checkIn.check_in_date,
        pose,
        storage_path: storagePath,
        caption: captionValue,
        uploaded_by: 'client',
      })
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    photo = data as ClientProgressPhoto
  }

  const [withUrl] = await attachSignedUrlsToPhotos(supabase, [photo])
  await revalidateProgressPhotoPaths(client.id)

  return { success: true, data: withUrl }
}

export async function deleteClientProgressPhoto(
  photoId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const portalCtx = await getPortalClientContext()
  const client = portalCtx?.client

  if (!client) {
    return { success: false, error: 'Client profile not found.' }
  }

  const { data: photo, error: fetchError } = await supabase
    .from('client_progress_photos')
    .select('id, client_id, storage_path, check_in_id')
    .eq('id', photoId)
    .eq('client_id', client.id)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (!photo) {
    return { success: false, error: 'Photo not found.' }
  }

  if (photo.check_in_id) {
    const { data: checkIn } = await supabase
      .from('client_check_ins')
      .select('reviewed_at')
      .eq('id', photo.check_in_id)
      .maybeSingle()

    if (checkIn?.reviewed_at) {
      return {
        success: false,
        error: 'This check-in has been reviewed and photos cannot be removed.',
      }
    }
  }

  const { error: storageError } = await supabase.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .remove([photo.storage_path])

  if (storageError) {
    return { success: false, error: storageError.message }
  }

  const { error: deleteError } = await supabase
    .from('client_progress_photos')
    .delete()
    .eq('id', photoId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  await revalidateProgressPhotoPaths(client.id)
  return { success: true }
}

export async function listPhotosForCheckIn(
  checkInId: string
): Promise<ClientProgressPhotoWithUrl[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_progress_photos')
    .select('*')
    .eq('check_in_id', checkInId)
    .order('pose', { ascending: true })

  if (error || !data) {
    return []
  }

  return attachSignedUrlsToPhotos(supabase, data as ClientProgressPhoto[])
}
