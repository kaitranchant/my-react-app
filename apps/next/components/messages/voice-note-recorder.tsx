'use client'

import * as React from 'react'
import { Mic, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  MESSAGE_VOICE_MAX_DURATION_SECONDS,
  isVoiceRecordingSupported,
} from '@/lib/message-media'
import { cn } from '@/lib/utils'

type VoiceNoteRecorderProps = {
  disabled?: boolean
  onRecorded: (file: File, durationSeconds: number) => void
  className?: string
}

export function VoiceNoteRecorder({
  disabled = false,
  onRecorded,
  className,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = React.useState(false)
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const chunksRef = React.useRef<BlobPart[]>([])
  const streamRef = React.useRef<MediaStream | null>(null)
  const startedAtRef = React.useRef<number | null>(null)
  const timerRef = React.useRef<number | null>(null)

  const supported = isVoiceRecordingSupported()

  React.useEffect(() => {
    return () => {
      stopTracks()
      if (timerRef.current != null) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function startRecording() {
    if (!supported || disabled || isRecording) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder
      startedAtRef.current = Date.now()
      setElapsedSeconds(0)
      setIsRecording(true)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const startedAt = startedAtRef.current ?? Date.now()
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - startedAt) / 1000)
        )
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const extension = blob.type.includes('mp4') ? 'm4a' : 'webm'
        const file = new File([blob], `voice-note.${extension}`, {
          type: blob.type || 'audio/webm',
        })

        stopTracks()
        setIsRecording(false)
        setElapsedSeconds(0)
        startedAtRef.current = null
        onRecorded(file, durationSeconds)
      }

      recorder.start()
      timerRef.current = window.setInterval(() => {
        const startedAt = startedAtRef.current
        if (!startedAt) return
        const seconds = Math.floor((Date.now() - startedAt) / 1000)
        setElapsedSeconds(seconds)
        if (seconds >= MESSAGE_VOICE_MAX_DURATION_SECONDS) {
          stopRecording()
        }
      }, 250)
    } catch {
      stopTracks()
      setIsRecording(false)
    }
  }

  function stopRecording() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      stopTracks()
      setIsRecording(false)
    }
  }

  if (!supported) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isRecording ? (
        <>
          <span className="text-muted-foreground text-xs tabular-nums">
            {elapsedSeconds}s
          </span>
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="shrink-0"
            onClick={stopRecording}
            title="Stop recording"
          >
            <Square className="size-4" />
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="shrink-0"
          disabled={disabled}
          onClick={() => void startRecording()}
          title="Record voice note"
        >
          <Mic className="size-4" />
        </Button>
      )}
    </div>
  )
}
