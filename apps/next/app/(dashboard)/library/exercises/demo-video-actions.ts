'use server'

import { revalidatePath } from 'next/cache'

import {
  EXERCISE_DEMO_BUCKET,
  EXERCISE_DEMO_MAX_BYTES,
  exerciseDemoStoragePath,
  resolveExerciseDemoContentType,
  withExerciseDemoCacheBuster,
  getExerciseDemoVideoUrl,
} from '@/lib/exercise-demo-video'
import { createClient } from '@/lib/supabase/server'

export type DemoVideoActionResult =
  | { success: true; videoUrl: string | null }
  | { success: false; error: string }

function revalidateExercisePaths() {
  revalidatePath('/library/exercises')
  revalidatePath('/library')
}

export async function uploadExerciseDemoVideo(
  exerciseId: string,
  formData: FormData
): Promise<DemoVideoActionResult> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No video provided.' }
  }

  const contentType = resolveExerciseDemoContentType(file)
  if (!contentType) {
    return {
      success: false,
      error: 'Unsupported file type. Use MP4, WebM, or MOV.',
    }
  }

  if (file.size > EXERCISE_DEMO_MAX_BYTES) {
    return { success: false, error: 'Video must be under 50 MB.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from('exercises')
    .select('id, coach_id, demo_video_path')
    .eq('id', exerciseId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (exerciseError || !exercise) {
    return { success: false, error: 'Exercise not found.' }
  }

  const storagePath = exerciseDemoStoragePath(
    user.id,
    exerciseId,
    contentType
  )
  const buffer = Buffer.from(await file.arrayBuffer())

  if (exercise.demo_video_path && exercise.demo_video_path !== storagePath) {
    await supabase.storage
      .from(EXERCISE_DEMO_BUCKET)
      .remove([exercise.demo_video_path])
  }

  const { error: uploadError } = await supabase.storage
    .from(EXERCISE_DEMO_BUCKET)
    .upload(storagePath, buffer, {
      upsert: true,
      contentType,
      cacheControl: '3600',
    })

  if (uploadError) {
    const message = uploadError.message.toLowerCase()
    if (message.includes('bucket') || message.includes('policy')) {
      return {
        success: false,
        error:
          'Exercise demo storage is not set up. Run db push or apply-exercise-demo-videos.sql.',
      }
    }
    return { success: false, error: uploadError.message }
  }

  const { error: updateError } = await supabase
    .from('exercises')
    .update({ demo_video_path: storagePath })
    .eq('id', exerciseId)
    .eq('coach_id', user.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  const publicUrl = getExerciseDemoVideoUrl(storagePath)
  revalidateExercisePaths()

  return {
    success: true,
    videoUrl: publicUrl ? withExerciseDemoCacheBuster(publicUrl) : null,
  }
}

export async function removeExerciseDemoVideo(
  exerciseId: string
): Promise<DemoVideoActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from('exercises')
    .select('demo_video_path')
    .eq('id', exerciseId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (exerciseError || !exercise) {
    return { success: false, error: 'Exercise not found.' }
  }

  if (exercise.demo_video_path) {
    await supabase.storage
      .from(EXERCISE_DEMO_BUCKET)
      .remove([exercise.demo_video_path])
  }

  const { error: updateError } = await supabase
    .from('exercises')
    .update({ demo_video_path: null })
    .eq('id', exerciseId)
    .eq('coach_id', user.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidateExercisePaths()
  return { success: true, videoUrl: null }
}
