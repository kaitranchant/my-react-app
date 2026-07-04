import type { FocusEvent } from 'react'

/** Delayed scrollIntoView for inputs outside a nested scroll container. */
export function scrollInputOnFocus(
  event: FocusEvent<HTMLElement>,
  delayMs = 300
) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  window.setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, delayMs)
}
