'use client'

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

function applyMainFreeze(main: HTMLElement) {
  const rect = main.getBoundingClientRect()
  const scrollTop = main.scrollTop

  main.style.position = 'fixed'
  main.style.top = `${rect.top}px`
  main.style.left = `${rect.left}px`
  main.style.width = `${rect.width}px`
  main.style.height = `${rect.height}px`
  main.style.overflow = 'hidden'
  main.style.overscrollBehavior = 'none'
  main.style.touchAction = 'none'

  return { scrollTop }
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
  main.scrollTop = 0
}

export function resetMainContentScroll() {
  const main = document.getElementById(MAIN_CONTENT_ID)
  if (!main) return
  main.scrollTop = 0
}

export function installMainContentFreeze() {
  const main = document.getElementById(MAIN_CONTENT_ID)
  if (!main) return () => {}

  const snapshot = readMainStyles(main)
  applyMainFreeze(main)

  const preventScroll = () => {
    if (main.scrollTop !== 0) {
      main.scrollTop = 0
    }
  }

  main.addEventListener('scroll', preventScroll, { passive: true })

  return () => {
    main.removeEventListener('scroll', preventScroll)
    restoreMainStyles(main, snapshot)
    resetMainContentScroll()
  }
}
