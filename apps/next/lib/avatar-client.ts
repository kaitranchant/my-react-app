import { AVATAR_MAX_UPLOAD_BYTES, AVATAR_SIZE_PX } from '@/lib/avatar'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function initialsFromName(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export async function processAvatarImage(file: File): Promise<File> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image is too large. Choose a file under 5 MB.')
  }

  const bitmap = await createImageBitmap(file)
  const size = AVATAR_SIZE_PX
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not process image.')
  }

  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale
  const x = (size - width) / 2
  const y = (size - height) / 2

  ctx.drawImage(bitmap, x, y, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('Could not compress image.'))
      },
      'image/webp',
      0.82
    )
  })

  if (blob.size > AVATAR_MAX_UPLOAD_BYTES) {
    throw new Error('Image is still too large after compression.')
  }

  return new File([blob], 'avatar.webp', { type: 'image/webp' })
}

export async function fileToPreviewUrl(file: File) {
  return URL.createObjectURL(file)
}
