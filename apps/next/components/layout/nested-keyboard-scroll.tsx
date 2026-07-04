'use client'

import * as React from 'react'

import { useNestedKeyboardScroll } from '@/lib/hooks/use-nested-keyboard-scroll'

type NestedKeyboardScrollProps = React.ComponentProps<'div'>

export function NestedKeyboardScroll({
  className,
  children,
  ...props
}: NestedKeyboardScrollProps) {
  const { scrollProps } = useNestedKeyboardScroll()

  return (
    <div {...props} {...scrollProps} className={className}>
      {children}
    </div>
  )
}
