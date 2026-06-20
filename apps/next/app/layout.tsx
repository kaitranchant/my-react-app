import { Plus_Jakarta_Sans } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { cn } from '@/lib/utils'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata = {
  title: 'Coaching App',
  description:
    'Professional coaching platform for trainers, therapists, and wellness coaches',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(jakarta.className, jakarta.variable, 'antialiased')}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
