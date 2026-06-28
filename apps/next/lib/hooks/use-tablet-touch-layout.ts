'use client'

import { useEffect, useState } from 'react'

const TABLET_TOUCH_MEDIA_QUERY = '(min-width: 768px) and (pointer: coarse)'

/** Tablet-sized touch devices (e.g. iPad) — not phone, not desktop with mouse. */
export function useTabletTouchLayout() {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(TABLET_TOUCH_MEDIA_QUERY)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return matches
}
