'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  coachingSessionTypeLabels,
  coachingSessionTypes,
  defaultCoachingSessionType,
} from '@/lib/coaching-session-types'
import type { CoachingSessionType } from 'app/types/database'

type SessionTypeSelectProps = {
  value: CoachingSessionType
  onValueChange: (value: CoachingSessionType) => void
  contentClassName?: string
}

export function SessionTypeSelect({
  value,
  onValueChange,
  contentClassName,
}: SessionTypeSelectProps) {
  return (
    <div className="space-y-2">
      <Label>Session type</Label>
      <Select
        value={value || defaultCoachingSessionType}
        onValueChange={(next) => onValueChange(next as CoachingSessionType)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select session type" />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {coachingSessionTypes.map((sessionType) => (
            <SelectItem key={sessionType} value={sessionType}>
              {coachingSessionTypeLabels[sessionType]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
