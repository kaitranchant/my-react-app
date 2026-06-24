import { BRAND_COLOR } from '@/lib/brand'

import {
  WING_MARK_PATHS,
  WING_MARK_STROKE_WIDTH,
  WING_MARK_VIEWBOX,
} from './wing-mark-paths'

type AppIconImageProps = {
  size: number
}

export function AppIconImage({ size }: AppIconImageProps) {
  const markSize = Math.round(size * 0.55)
  const radius = Math.round(size * 0.22)
  const strokeWidth = WING_MARK_STROKE_WIDTH * (markSize / 32)

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND_COLOR,
        borderRadius: radius,
      }}
    >
      <svg
        width={markSize}
        height={Math.round(markSize * 0.62)}
        viewBox={WING_MARK_VIEWBOX}
        fill="none"
      >
        <path
          d={WING_MARK_PATHS.leftWing}
          stroke="white"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={WING_MARK_PATHS.rightWing}
          stroke="white"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
