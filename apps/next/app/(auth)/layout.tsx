import { BrandLogo } from '@/components/dashboard/brand-logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,28rem)] xl:grid-cols-2">
      <div className="auth-panel-bg relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <BrandLogo />
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Run your coaching business from one place.
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Manage clients, track progress, and build programs — built for
            personal trainers and coaches who want clarity without clutter.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          Secure sign-in powered by Supabase
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
