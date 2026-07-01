'use client'

import Link from 'next/link'
import { startTransition } from 'react'
import { useRouter } from 'next/navigation'

type DeferredNavigationLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
}

export function DeferredNavigationLink({
  href,
  className,
  children,
}: DeferredNavigationLinkProps) {
  const router = useRouter()

  function handlePointerDown(event: React.PointerEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    // Prevent blur on the active field so autosave server actions don't queue
    // ahead of client navigation.
    event.preventDefault()
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <Link href={href} className={className} onPointerDown={handlePointerDown}>
      {children}
    </Link>
  )
}
