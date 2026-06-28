import { Plus_Jakarta_Sans } from 'next/font/google'

import { Toaster } from '@/components/ui/sonner'
import { AppViewportSync } from '@/components/layout/app-viewport-sync'
import { ThemeProvider } from '@/components/theme-provider'
import { APP_DESCRIPTION, APP_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
  interactiveWidget: 'overlays-content' as const,
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
          <AppViewportSync />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
