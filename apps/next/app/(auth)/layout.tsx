import { BrandLogo } from '@/components/dashboard/brand-logo'
import { SwiftWordmark } from '@/components/brand/swift-wordmark'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,28rem)] xl:grid-cols-2">
      <div className="auth-panel-bg relative hidden flex-col items-start justify-between overflow-hidden border-r p-10 lg:flex">
        <SwiftWordmark className="h-10 w-auto" />
        <div className="max-w-md space-y-5">
          <h2 className="text-4xl font-semibold tracking-tight text-balance leading-[1.1]">
            Run your coaching business from one place.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Manage clients, build programs, and track progress — built for
            coaches, trainers, and therapists who want clarity without clutter.
          </p>
        </div>
        <p className="text-muted-foreground text-xs font-medium">
          Secure sign-in
        </p>
      </div>

      <div className="flex min-h-screen flex-col p-6 sm:p-10 lg:min-h-0 lg:justify-center">
        <div className="mb-8 self-start lg:hidden">
          <SwiftWordmark className="h-9 w-auto" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center lg:flex-none">
          <BrandLogo
            className="mb-8 justify-center"
            markClassName="h-10 w-auto"
          />
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}
