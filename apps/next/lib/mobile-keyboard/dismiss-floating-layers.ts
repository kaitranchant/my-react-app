/** Close open Radix selects and dropdowns without dismissing parent dialogs. */
export function dismissFloatingLayers() {
  if (typeof document === 'undefined') return

  document
    .querySelectorAll('[data-slot="select-trigger"]')
    .forEach((trigger) => {
      if (
        trigger instanceof HTMLElement &&
        trigger.getAttribute('aria-expanded') === 'true'
      ) {
        trigger.click()
      }
    })

  document
    .querySelectorAll('[data-slot="dropdown-menu-trigger"]')
    .forEach((trigger) => {
      if (
        trigger instanceof HTMLElement &&
        trigger.getAttribute('data-state') === 'open'
      ) {
        trigger.click()
      }
    })
}
