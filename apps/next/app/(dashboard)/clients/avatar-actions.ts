'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  AVATAR_MAX_UPLOAD_BYTES,
  clientAvatarStoragePath,
  withAvatarCacheBuster,
} from '@/lib/avatar'

export type AvatarUploadResult =
  | { success: true; avatarUrl: string }
  | { success: false; error: string }

async function persistAvatar(
  clientId: string,
  file: File,
  options: { asClient: boolean }
): Promise<AvatarUploadResult> {
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'Invalid image type.' }
  }

  if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
    return { success: false, error: 'Image must be under 100 KB.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  let clientQuery = supabase.from('clients').select('*').eq('id', clientId)

  if (options.asClient) {
    clientQuery = clientQuery.eq('user_id', user.id)
  } else {
    clientQuery = clientQuery.eq('coach_id', user.id)
  }

  const { data: client, error: fetchError } = await clientQuery.maybeSingle()

  if (fetchError) {
    const message = fetchError.message.toLowerCase()
    if (message.includes('user_id') || message.includes('avatar_url')) {
      return {
        success: false,
        error:
          'Database schema is out of date. Run supabase db push (hosted) or supabase db reset (local).',
      }
    }
    return { success: false, error: fetchError.message }
  }

  if (!client) {
    return { success: false, error: 'Client not found.' }
  }

  const isCoach = client.coach_id === user.id
  const isLinkedClient =
    client.user_id != null && client.user_id === user.id

  if (options.asClient && !isLinkedClient) {
    return { success: false, error: 'You cannot update this photo.' }
  }

  if (!options.asClient && !isCoach) {
    return { success: false, error: 'You cannot update this photo.' }
  }

  const path = clientAvatarStoragePath(clientId)
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, {
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
          'Avatar storage is not set up. Run supabase db push (hosted) or supabase db reset (local).',
      }
    }
    return { success: false, error: uploadError.message }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(path)

  const avatarUrl = withAvatarCacheBuster(publicUrl)

  const { error: updateError } = await supabase
    .from('clients')
    .update({ avatar_url: avatarUrl })
    .eq('id', clientId)

  if (updateError) {
    const message = updateError.message.toLowerCase()
    if (message.includes('avatar_url')) {
      return {
        success: false,
        error:
          'Database schema is out of date. Run supabase db push (hosted) or supabase db reset (local).',
      }
    }
    return { success: false, error: updateError.message }
  }

  if (isLinkedClient) {
    await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/portal')

  return { success: true, avatarUrl }
}

export async function uploadClientAvatar(
  clientId: string,
  formData: FormData
): Promise<AvatarUploadResult> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No image provided.' }
  }

  return persistAvatar(clientId, file, { asClient: false })
}

export async function uploadMyClientAvatar(
  formData: FormData
): Promise<AvatarUploadResult> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No image provided.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('user_id')) {
      return {
        success: false,
        error:
          'Database schema is out of date. Run supabase db push (hosted) or supabase db reset (local).',
      }
    }
    return { success: false, error: error.message }
  }

  if (!client) {
    return { success: false, error: 'Client profile not found.' }
  }

  return persistAvatar(client.id, file, { asClient: true })
}

export async function uploadPendingClientAvatar(
  clientId: string,
  formData: FormData
): Promise<AvatarUploadResult> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: true, avatarUrl: '' }
  }

  return uploadClientAvatar(clientId, formData)
}
