'use client'

import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { BrandLogo } from '@/components/dashboard/brand-logo'
import { PortalNavContent } from '@/components/portal/portal-nav-content'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type PortalMobileMenuProps = {
  showTeamNav?: boolean
}

export function PortalMobileMenu({ showTeamNav = false }: PortalMobileMenuProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative z-20 shrink-0 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[min(100vw-3rem,280px)] gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="shrink-0 border-b px-5 py-4 text-left">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <BrandLogo />
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4">
            <PortalNavContent
              showTeamNav={showTeamNav}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
