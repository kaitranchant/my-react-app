'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  AVATAR_MAX_UPLOAD_BYTES,
  coachAvatarStoragePath,
  withAvatarCacheBuster,
} from '@/lib/avatar'

export type AvatarUploadResult =
  | { success: true; avatarUrl: string }
  | { success: false; error: string }

function revalidateCoachAvatar() {
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/', 'layout')
}

export async function uploadCoachAvatar(
  formData: FormData
): Promise<AvatarUploadResult> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No image provided.' }
  }

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

  const path = coachAvatarStoragePath(user.id)
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
    if (message.includes('bucket') || message.includes('policy')) {
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
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidateCoachAvatar()
  return { success: true, avatarUrl }
}

export async function removeCoachAvatar(): Promise<AvatarUploadResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const path = coachAvatarStoragePath(user.id)
  await supabase.storage.from('avatars').remove([path])

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidateCoachAvatar()
  return { success: true, avatarUrl: '' }
}
