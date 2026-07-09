'use client'

import { ExternalLink } from 'lucide-react'

import {
  exerciseDemoLinkLabel,
  parseExerciseDemoVideoUrl,
  type ParsedExerciseDemoLink,
} from '@/lib/exercise-media'

type ExerciseDemoLinkPlayerProps = {
  url: string | null | undefined
  title: string
  className?: string
  videoClassName?: string
}

function DemoLinkFallback({ link }: { link: ParsedExerciseDemoLink }) {
  return (
    <a
      href={link.rawUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center gap-2 rounded-lg border px-4 py-8 text-sm font-medium transition-colors"
    >
      <ExternalLink className="size-4 shrink-0" />
      Open {exerciseDemoLinkLabel(link.kind)}
    </a>
  )
}

export function ExerciseDemoLinkPlayer({
  url,
  title,
  className,
  videoClassName = 'mx-auto max-h-[min(50vh,360px)] w-full object-contain',
}: ExerciseDemoLinkPlayerProps) {
  const link = parseExerciseDemoVideoUrl(url)
  if (!link) return null

  if (link.embedUrl) {
    return (
      <div className={className ?? 'bg-muted overflow-hidden rounded-lg'}>
        <div className="aspect-video w-full">
          <iframe
            src={link.embedUrl}
            title={`${title} demonstration`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    )
  }

  if (link.videoSrc) {
    return (
      <div className={className ?? 'bg-muted overflow-hidden rounded-lg'}>
        <video
          src={link.videoSrc}
          controls
          playsInline
          preload="metadata"
          className={videoClassName}
        />
      </div>
    )
  }

  return <DemoLinkFallback link={link} />
}
