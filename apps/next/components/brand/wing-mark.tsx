import { cn } from '@/lib/utils'

import {
  WING_MARK_PATHS,
  WING_MARK_STROKE_WIDTH,
  WING_MARK_VIEWBOX,
} from './wing-mark-paths'

type WingMarkProps = {
  className?: string
  variant?: 'default' | 'on-brand'
}

export function WingMark({ className, variant = 'default' }: WingMarkProps) {
  const stroke = 'currentColor'

  return (
    <svg
      viewBox={WING_MARK_VIEWBOX}
      fill="none"
      aria-hidden
      className={cn(
        variant === 'default' ? 'text-brand' : 'text-white',
        className
      )}
    >
      <path
        d={WING_MARK_PATHS.leftWing}
        stroke={stroke}
        strokeWidth={WING_MARK_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={WING_MARK_PATHS.rightWing}
        stroke={stroke}
        strokeWidth={WING_MARK_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
