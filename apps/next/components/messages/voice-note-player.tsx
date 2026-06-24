'use client'

import { cn } from '@/lib/utils'

type VoiceNotePlayerProps = {
  signedUrl: string | null
  durationSeconds?: number | null
  className?: string
}

export function VoiceNotePlayer({
  signedUrl,
  durationSeconds,
  className,
}: VoiceNotePlayerProps) {
  if (!signedUrl) {
    return (
      <p className={cn('text-xs opacity-80', className)}>
        Voice message unavailable
      </p>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <audio controls preload="metadata" className="max-w-full">
        <source src={signedUrl} />
      </audio>
      {durationSeconds != null && durationSeconds > 0 ? (
        <p className="text-[11px] opacity-75">{Math.round(durationSeconds)}s</p>
      ) : null}
    </div>
  )
}
