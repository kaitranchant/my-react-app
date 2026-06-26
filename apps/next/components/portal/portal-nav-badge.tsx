export function PortalNavBadge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <span
      data-testid="portal-nav-badge"
      className="bg-brand text-brand-foreground ml-auto flex min-w-[1.125rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold leading-none"
      aria-label={`${count} notification${count === 1 ? '' : 's'}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

export function PortalNavIconBadge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <span
      data-testid="portal-nav-badge"
      className="bg-brand text-brand-foreground absolute -top-1 -right-1 flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none"
      aria-label={`${count} notification${count === 1 ? '' : 's'}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
