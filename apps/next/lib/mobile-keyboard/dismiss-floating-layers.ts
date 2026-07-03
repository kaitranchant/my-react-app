/** Close open Radix selects, dropdowns, and popovers before showing the mobile keyboard. */
export function dismissFloatingLayers() {
  if (typeof document === 'undefined') return

  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    })
  )
}
