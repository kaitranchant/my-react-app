import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  hasExerciseMedia,
  parseExerciseDemoVideoUrl,
} from '@/lib/exercise-media'

describe('parseExerciseDemoVideoUrl', () => {
  it('parses YouTube watch URLs', () => {
    const parsed = parseExerciseDemoVideoUrl(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    )
    assert.equal(parsed?.kind, 'youtube')
    assert.ok(parsed?.embedUrl?.includes('dQw4w9WgXcQ'))
  })

  it('parses youtu.be short links', () => {
    const parsed = parseExerciseDemoVideoUrl('https://youtu.be/dQw4w9WgXcQ')
    assert.equal(parsed?.kind, 'youtube')
    assert.ok(parsed?.embedUrl?.includes('dQw4w9WgXcQ'))
  })

  it('parses YouTube shorts', () => {
    const parsed = parseExerciseDemoVideoUrl(
      'https://www.youtube.com/shorts/dQw4w9WgXcQ'
    )
    assert.equal(parsed?.kind, 'youtube')
  })

  it('parses Vimeo URLs', () => {
    const parsed = parseExerciseDemoVideoUrl('https://vimeo.com/123456789')
    assert.equal(parsed?.kind, 'vimeo')
    assert.ok(parsed?.embedUrl?.includes('123456789'))
  })

  it('parses direct video file URLs', () => {
    const parsed = parseExerciseDemoVideoUrl(
      'https://cdn.example.com/demos/squat.mp4'
    )
    assert.equal(parsed?.kind, 'direct')
    assert.ok(parsed?.videoSrc?.includes('squat.mp4'))
  })

  it('falls back to generic link for other URLs', () => {
    const parsed = parseExerciseDemoVideoUrl(
      'https://example.com/form-guide'
    )
    assert.equal(parsed?.kind, 'link')
    assert.equal(parsed?.embedUrl, null)
  })

  it('rejects invalid URLs', () => {
    assert.equal(parseExerciseDemoVideoUrl('not a url'), null)
    assert.equal(parseExerciseDemoVideoUrl(''), null)
  })
})

describe('hasExerciseMedia', () => {
  it('returns true when a demo video URL is present', () => {
    assert.equal(
      hasExerciseMedia({
        external_id: null,
        image_url: null,
        demo_video_path: null,
        demo_video_url: 'https://youtu.be/dQw4w9WgXcQ',
        instructions: null,
      }),
      true
    )
  })
})
