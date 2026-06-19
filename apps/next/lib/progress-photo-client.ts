import { PROGRESS_PHOTO_MAX_UPLOAD_BYTES } from '@/lib/progress-photos'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_LONG_EDGE_PX = 1200

export async function processProgressPhotoImage(file: File): Promise<File> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.')
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image is too large. Choose a file under 10 MB.')
  }

  const bitmap = await createImageBitmap(file)
  const longEdge = Math.max(bitmap.width, bitmap.height)
  const scale = longEdge > MAX_LONG_EDGE_PX ? MAX_LONG_EDGE_PX / longEdge : 1
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not process image.')
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality = 0.85
  let blob = await canvasToBlob(canvas, quality)

  while (blob.size > PROGRESS_PHOTO_MAX_UPLOAD_BYTES && quality > 0.5) {
    quality -= 0.05
    blob = await canvasToBlob(canvas, quality)
  }

  if (blob.size > PROGRESS_PHOTO_MAX_UPLOAD_BYTES) {
    throw new Error('Image is still too large after compression.')
  }

  return new File([blob], 'progress-photo.webp', { type: 'image/webp' })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('Could not compress image.'))
      },
      'image/webp',
      quality
    )
  })
}
