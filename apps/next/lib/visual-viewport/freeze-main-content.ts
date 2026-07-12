'use client'

import { burstStabilizeViewportScroll } from '@/lib/visual-viewport/app-viewport'

const MAIN_CONTENT_ID = 'main-content'

type FrozenMainContent = {
  scrollTop: number
  position: string
  top: string
  left: string
  width: string
  height: string
  overflow: string
  overscrollBehavior: string
  touchAction: string
}

function readMainStyles(main: HTMLElement): FrozenMainContent {
  return {
    scrollTop: main.scrollTop,
    position: main.style.position,
    top: main.style.top,
    left: main.style.left,
    width: main.style.width,
    height: main.style.height,
    overflow: main.style.overflow,
    overscrollBehavior: main.style.overscrollBehavior,
    touchAction: main.style.touchAction,
  }
}

function applyMainFreeze(main: HTMLElement, pinnedScrollTop: number) {
  const rect = main.getBoundingClientRect()

  main.style.position = 'fixed'
  main.style.top = `${rect.top}px`
  main.style.left = `${rect.left}px`
  main.style.width = `${rect.width}px`
  main.style.height = `${rect.height}px`
  main.style.overflow = 'hidden'
  main.style.overscrollBehavior = 'none'
  main.style.touchAction = 'none'

  return pinnedScrollTop
}

function restoreStyleProperty(
  main: HTMLElement,
  property: string,
  value: string
) {
  if (value) {
    main.style.setProperty(property, value)
  } else {
    main.style.removeProperty(property)
  }
}

function restoreMainStyles(main: HTMLElement, snapshot: FrozenMainContent) {
  restoreStyleProperty(main, 'position', snapshot.position)
  restoreStyleProperty(main, 'top', snapshot.top)
  restoreStyleProperty(main, 'left', snapshot.left)
  restoreStyleProperty(main, 'width', snapshot.width)
  restoreStyleProperty(main, 'height', snapshot.height)
  restoreStyleProperty(main, 'overflow', snapshot.overflow)
  restoreStyleProperty(main, 'overscroll-behavior', snapshot.overscrollBehavior)
  restoreStyleProperty(main, 'touch-action', snapshot.touchAction)
  main.scrollTop = snapshot.scrollTop
}

let freezeDepth = 0
let releaseRoot: (() => void) | null = null

export function installMainContentFreeze() {
  const main = document.getElementById(MAIN_CONTENT_ID)
  if (!main) return () => {}

  if (freezeDepth === 0) {
    const snapshot = readMainStyles(main)
    const pinnedScrollTop = snapshot.scrollTop
    applyMainFreeze(main, pinnedScrollTop)

    const preventScroll = () => {
      if (main.scrollTop !== pinnedScrollTop) {
        main.scrollTop = pinnedScrollTop
      }
    }

    main.addEventListener('scroll', preventScroll, { passive: true })

    releaseRoot = () => {
      main.removeEventListener('scroll', preventScroll)
      restoreMainStyles(main, snapshot)
      burstStabilizeViewportScroll(400)
    }
  }

  freezeDepth += 1

  return () => {
    if (freezeDepth <= 0) return

    freezeDepth -= 1
    if (freezeDepth === 0 && releaseRoot) {
      const release = releaseRoot
      releaseRoot = null
      release()
    }
  }
}
