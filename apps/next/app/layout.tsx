import { Barlow } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import './globals.css'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

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
      <body className={cn(barlow.className, barlow.variable, 'antialiased')}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
