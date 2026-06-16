import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata = {
  title: 'Coaching App',
  description: 'Client and athlete management for coaches and personal trainers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
