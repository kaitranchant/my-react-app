'use client'

import { useEffect, useState } from 'react'

export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return coarse
}
