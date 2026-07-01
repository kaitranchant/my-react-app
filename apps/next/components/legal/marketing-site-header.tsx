import Link from 'next/link'

import { SwiftWordmark } from '@/components/brand/swift-wordmark'
import { Button } from '@/components/ui/button'

type MarketingSiteHeaderProps = {
  isSignedIn: boolean
}

export function MarketingSiteHeader({ isSignedIn }: MarketingSiteHeaderProps) {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href={isSignedIn ? '/dashboard' : '/login'}>
          <SwiftWordmark className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild variant="brand" size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
