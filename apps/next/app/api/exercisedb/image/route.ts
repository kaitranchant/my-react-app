import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Legacy proxy route — redirects to bundled static images. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const exerciseId = searchParams.get('exerciseId')

  if (!exerciseId) {
    return new Response('Missing exerciseId', { status: 400 })
  }

  const imagePath = path.join(
    process.cwd(),
    'public',
    'exercises',
    exerciseId,
    '0.jpg'
  )

  try {
    const body = readFileSync(imagePath)
    return new Response(body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new Response('Image not found', { status: 404 })
  }
}
