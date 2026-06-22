'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

type TabsVariant = 'default' | 'filter'

const TabsVariantContext = React.createContext<TabsVariant>('default')

const tabsListVariants = cva('inline-flex w-fit items-center justify-center', {
  variants: {
    variant: {
      default:
        'bg-muted text-muted-foreground h-9 rounded-lg p-[3px]',
      filter: 'h-auto flex-wrap gap-1.5 bg-transparent p-0',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-[color,box-shadow,background-color,border-color] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        default:
          'h-[calc(100%-1px)] flex-1 rounded-md border border-transparent px-2 py-1 text-sm font-medium text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm dark:text-muted-foreground',
        filter:
          'filter-pill h-auto shrink-0 flex-none rounded-lg border px-4 py-1.5 text-sm transition-[color,background-color,border-color] focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=inactive]:border-border data-[state=inactive]:bg-transparent data-[state=inactive]:font-medium data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=active]:border-transparent data-[state=active]:bg-brand data-[state=active]:font-semibold data-[state=active]:text-brand-foreground',
      },
      size: {
        default: '',
        sm: 'px-3 py-1 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Tabs({
  variant = 'default',
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & {
  variant?: TabsVariant
}) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn('flex flex-col gap-2', className)}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
}

function TabsList({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const contextVariant = React.useContext(TabsVariantContext)

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        tabsListVariants({ variant: variant ?? contextVariant }),
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> &
  VariantProps<typeof tabsTriggerVariants>) {
  const contextVariant = React.useContext(TabsVariantContext)

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        tabsTriggerVariants({
          variant: variant ?? contextVariant,
          size: (variant ?? contextVariant) === 'filter' ? size : 'default',
        }),
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
