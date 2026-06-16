import { Dumbbell } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <Dumbbell className="size-5" />
        </div>
        Coaching App
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
