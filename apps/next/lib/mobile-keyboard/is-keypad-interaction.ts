export const MOBILE_KEYPAD_SELECTOR =
  '[data-mobile-keypad], .mobile-keypad-surface, .workout-log-keypad-surface'

export function isMobileKeypadInteraction(target: EventTarget | null) {
  return (
    target instanceof Element && target.closest(MOBILE_KEYPAD_SELECTOR) != null
  )
}
