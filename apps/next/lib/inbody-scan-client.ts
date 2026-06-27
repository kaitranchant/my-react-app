import type { ParseInbodyScanImageResult } from '@/app/(dashboard)/inbody/actions'

const ACCEPTED_INPUT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  '',
])

const MAX_SOURCE_BYTES = 10 * 1024 * 1024
const MAX_LONG_EDGE_PX = 1400
const MAX_UPLOAD_BYTES = 800 * 1024

export async function processInbodyScanImage(file: File): Promise<File> {
  if (!ACCEPTED_INPUT_TYPES.has(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image.')
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Image is too large. Choose a file under 10 MB.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Could not read this image. Try a JPG or PNG screenshot.')
  }

  const longEdge = Math.max(bitmap.width, bitmap.height)
  const scale = longEdge > MAX_LONG_EDGE_PX ? MAX_LONG_EDGE_PX / longEdge : 1
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not process image.')
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const compressed = await compressCanvas(canvas)
  return new File([compressed.blob], compressed.filename, {
    type: compressed.mimeType,
  })
}

async function compressCanvas(canvas: HTMLCanvasElement) {
  for (const mimeType of ['image/webp', 'image/jpeg'] as const) {
    const extension = mimeType === 'image/webp' ? 'webp' : 'jpg'
    let quality = 0.82

    while (quality >= 0.45) {
      const blob = await canvasToBlob(canvas, mimeType, quality)
      if (blob.size <= MAX_UPLOAD_BYTES) {
        return {
          blob,
          mimeType,
          filename: `inbody-scan.${extension}`,
        }
      }
      quality -= 0.05
    }
  }

  throw new Error('Image is still too large after compression.')
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/webp' | 'image/jpeg',
  quality: number
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result)
        else reject(new Error('Could not compress image.'))
      },
      mimeType,
      quality
    )
  })
}

export async function parseCoachInbodyScanImageViaApi(
  clientId: string,
  file: File
): Promise<ParseInbodyScanImageResult> {
  const formData = new FormData()
  formData.set('clientId', clientId)
  formData.set('file', file)

  let response: Response
  try {
    response = await fetch('/api/inbody/scan', {
      method: 'POST',
      body: formData,
    })
  } catch {
    return {
      success: false,
      error: 'Could not reach the server. Check your connection and try again.',
    }
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as ParseInbodyScanImageResult
  }

  const message =
    response.status >= 400 && contentType.includes('text/plain')
      ? await response.text()
      : response.status === 413
        ? 'Image is too large to upload. Try a smaller photo.'
        : response.status === 504
          ? 'Reading the scan took too long. Try again with a clearer photo.'
          : 'Could not read metrics from this image. Try again.'

  return { success: false, error: message }
}
