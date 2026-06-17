import { EXERCISEDB_BASE_URL, EXERCISEDB_HOST } from '@/lib/exercisedb'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const exerciseId = searchParams.get('exerciseId')

  if (!exerciseId) {
    return new Response('Missing exerciseId', { status: 400 })
  }

  const key = process.env.EXERCISEDB_RAPIDAPI_KEY?.trim()
  if (!key) {
    return new Response('ExerciseDB not configured', { status: 503 })
  }

  const resolution = searchParams.get('resolution') ?? '180'
  const upstream = new URL('/image', EXERCISEDB_BASE_URL)
  upstream.searchParams.set('exerciseId', exerciseId)
  upstream.searchParams.set('resolution', resolution)

  const response = await fetch(upstream.toString(), {
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': EXERCISEDB_HOST,
    },
    cache: 'force-cache',
    next: { revalidate: 86_400 },
  })

  if (!response.ok) {
    return new Response('Image not found', { status: response.status })
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'image/gif',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
