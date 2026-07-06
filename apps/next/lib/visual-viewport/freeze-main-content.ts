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

function restoreMainStyles(main: HTMLElement, snapshot: FrozenMainContent) {
  main.style.position = snapshot.position
  main.style.top = snapshot.top
  main.style.left = snapshot.left
  main.style.width = snapshot.width
  main.style.height = snapshot.height
  main.style.overflow = snapshot.overflow
  main.style.overscrollBehavior = snapshot.overscrollBehavior
  main.style.touchAction = snapshot.touchAction
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
