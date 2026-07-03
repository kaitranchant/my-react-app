'use client'

import { usePreferMobileKeyboard } from '@/lib/hooks/use-prefer-mobile-keyboard'

/**
 * Prefer the in-app workout log keypad over native number inputs on phones,
 * iPads, and other touch-first layouts. Desktop browsers with a mouse keep
 * native inputs so a physical keyboard can be used.
 */
export function usePreferWorkoutLogKeypad() {
  return usePreferMobileKeyboard()
}
