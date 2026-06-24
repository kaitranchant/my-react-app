import { ImageResponse } from 'next/og'

import { AppIconImage } from '@/components/brand/app-icon-image'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(<AppIconImage size={32} />, {
    ...size,
  })
}
