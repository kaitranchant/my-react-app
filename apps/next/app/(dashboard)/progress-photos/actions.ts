'use server'

import { revalidatePath } from 'next/cache'

import { attachSignedUrlsToPhotos, PROGRESS_PHOTOS_BUCKET } from '@/lib/progress-photos'
import { createClient } from '@/lib/supabase/server'
import type { ClientProgressPhotoWithClient } from 'app/types/database'

type ActionResult = { success: true } | { success: false; error: string }

export async function deleteCoachProgressPhoto(
  photoId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: photo, error: fetchError } = await supabase
    .from('client_progress_photos')
    .select('id, client_id, coach_id, storage_path')
    .eq('id', photoId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (!photo) {
    return { success: false, error: 'Photo not found.' }
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

  revalidatePath('/progress-photos')
  revalidatePath('/check-ins')
  revalidatePath(`/clients/${photo.client_id}`)
  return { success: true }
}

export async function fetchCoachProgressPhotos(
  limit = 50
): Promise<ClientProgressPhotoWithClient[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_progress_photos')
    .select('*, client:clients(id, full_name, avatar_url, email)')
    .order('photo_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  const photos = data.map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client
    return {
      ...(row as Omit<ClientProgressPhotoWithClient, 'signedUrl' | 'client'>),
      client: client ?? null,
    }
  })

  const withUrls = await attachSignedUrlsToPhotos(supabase, photos)

  return withUrls.map((photo, index) => ({
    ...photo,
    client: photos[index]?.client ?? null,
  }))
}

export async function fetchClientProgressPhotos(
  clientId: string,
  limit = 50
): Promise<ClientProgressPhotoWithClient[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_progress_photos')
    .select('*, client:clients(id, full_name, avatar_url, email)')
    .eq('client_id', clientId)
    .order('photo_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  const photos = data.map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client
    return {
      ...(row as Omit<ClientProgressPhotoWithClient, 'signedUrl' | 'client'>),
      client: client ?? null,
    }
  })

  const withUrls = await attachSignedUrlsToPhotos(supabase, photos)

  return withUrls.map((photo, index) => ({
    ...photo,
    client: photos[index]?.client ?? null,
  }))
}

export async function fetchCheckInPhotoCounts(
  checkInIds: string[]
): Promise<Record<string, number>> {
  if (checkInIds.length === 0) {
    return {}
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_progress_photos')
    .select('check_in_id')
    .in('check_in_id', checkInIds)

  if (error || !data) {
    return {}
  }

  const counts: Record<string, number> = {}
  for (const row of data) {
    if (!row.check_in_id) continue
    counts[row.check_in_id] = (counts[row.check_in_id] ?? 0) + 1
  }

  return counts
}
