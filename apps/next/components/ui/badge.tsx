import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        success:
          'border-transparent bg-status-success text-white [a&]:hover:bg-status-success/90',
        warning:
          'border-transparent bg-status-warning text-white [a&]:hover:bg-status-warning/90',
        'success-soft':
          'border-status-success/30 bg-status-success/10 text-status-success [a&]:hover:bg-status-success/15',
        'warning-soft':
          'border-status-warning/30 bg-status-warning/10 text-status-warning [a&]:hover:bg-status-warning/15',
        'danger-soft':
          'border-status-danger/30 bg-status-danger/10 text-status-danger [a&]:hover:bg-status-danger/15',
        'brand-soft':
          'border-brand/30 bg-brand/10 text-brand [a&]:hover:bg-brand/15',
        neutral:
          'border-status-neutral/30 bg-status-neutral text-status-neutral-foreground [a&]:hover:bg-status-neutral/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
