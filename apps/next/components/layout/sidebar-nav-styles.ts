import { cn } from '@/lib/utils'

export const sidebarIconSlotClass =
  'relative flex size-[18px] shrink-0 items-center justify-center'

export function sidebarNavLinkClass(active: boolean, expanded: boolean) {
  return cn(
    'flex min-h-11 w-full items-center rounded-lg py-2 text-sm font-medium transition-colors',
    expanded ? 'justify-start gap-3 px-3' : 'justify-center px-0',
    active
      ? 'bg-brand/10 text-brand font-semibold'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )
}

export function sidebarGroupButtonClass(hasActiveItem: boolean, expanded: boolean) {
  return sidebarNavLinkClass(hasActiveItem, expanded)
}

export function sidebarSubmenuClass(open: boolean, expanded: boolean) {
  if (!expanded || !open) return 'hidden'

  return 'border-border/60 ml-[18px] space-y-0.5 border-l pl-2'
}
