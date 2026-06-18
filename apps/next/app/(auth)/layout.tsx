import { BrandLogo } from '@/components/dashboard/brand-logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,28rem)] xl:grid-cols-2">
      <div className="auth-panel-bg relative hidden flex-col justify-between overflow-hidden border-r p-10 lg:flex">
        <BrandLogo />
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

      <div className="flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
        <div className="lg:hidden">
          <BrandLogo />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
