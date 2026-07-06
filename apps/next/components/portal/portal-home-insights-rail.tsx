import * as React from 'react'

type PortalHomeInsightsRailProps = {
  title?: string
  children: React.ReactNode
}

export function PortalHomeInsightsRail({
  title = 'More',
  children,
}: PortalHomeInsightsRailProps) {
  const items = React.Children.toArray(children).filter(Boolean)
  if (items.length === 0) {
    return null
  }

  if (items.length === 1) {
    return <div className="min-w-0">{items[0]}</div>
  }

  return (
    <section className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </p>
      <div className="-mx-4 overflow-x-auto px-4 pb-1">
        <div className="flex w-max items-stretch gap-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex w-[min(78vw,18rem)] shrink-0 flex-col [&>*]:h-full"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
