'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  teamEventAttendanceDotClass,
  teamEventAttendanceLabels,
  teamEventAttendanceTriggerClass,
} from '@/lib/team-labels'
import { teamEventAttendanceStatuses } from '@/lib/validations/team'
import { cn } from '@/lib/utils'
import type { TeamEventAttendanceStatus } from 'app/types/database'

type AttendanceStatusSelectProps = {
  value: TeamEventAttendanceStatus | null
  onValueChange: (value: TeamEventAttendanceStatus | null) => void
  disabled?: boolean
  className?: string
}

function StatusDot({ status }: { status: TeamEventAttendanceStatus }) {
  return (
    <span
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        teamEventAttendanceDotClass[status]
      )}
      aria-hidden
    />
  )
}

export function AttendanceStatusSelect({
  value,
  onValueChange,
  disabled = false,
  className,
}: AttendanceStatusSelectProps) {
  return (
    <Select
      value={value ?? 'unset'}
      onValueChange={(next) =>
        onValueChange(
          next === 'unset' ? null : (next as TeamEventAttendanceStatus)
        )
      }
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-[10rem] shrink-0 [&_[data-slot=select-value]]:line-clamp-none',
          value ? teamEventAttendanceTriggerClass[value] : undefined,
          className
        )}
      >
        <SelectValue placeholder="Attendance">
          {value ? (
            <span className="flex items-center gap-2">
              <StatusDot status={value} />
              {teamEventAttendanceLabels[value]}
            </span>
          ) : (
            'Not logged'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unset">Not logged</SelectItem>
        {teamEventAttendanceStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            <span className="flex items-center gap-2">
              <StatusDot status={status} />
              {teamEventAttendanceLabels[status]}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function AttendanceStatusCell({
  status,
  className,
}: {
  status: TeamEventAttendanceStatus | null
  className?: string
}) {
  if (!status) {
    return (
      <span
        className={cn(
          'inline-flex size-7 items-center justify-center rounded-md border border-dashed bg-muted/30',
          className
        )}
        title="Not logged"
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md border',
        teamEventAttendanceTriggerClass[status],
        className
      )}
      title={teamEventAttendanceLabels[status]}
    >
      <StatusDot status={status} />
    </span>
  )
}
