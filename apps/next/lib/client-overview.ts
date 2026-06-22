import type { Client, ClientInviteStatus, ClientStatus } from 'app/types/database'

export function formatClientSince(createdAt: string): {
  primary: string
  secondary: string
} {
  const created = new Date(createdAt)
  const now = new Date()
  const months =
    (now.getFullYear() - created.getFullYear()) * 12 +
    (now.getMonth() - created.getMonth())

  let primary: string
  if (months < 1) {
    const days = Math.max(
      1,
      Math.floor((now.getTime() - created.getTime()) / 86_400_000)
    )
    primary = days === 1 ? '1 day' : `${days} days`
  } else if (months < 12) {
    primary = months === 1 ? '1 month' : `${months} months`
  } else {
    const years = Math.floor(months / 12)
    primary = years === 1 ? '1 year' : `${years} years`
  }

  const secondary = `Joined ${created.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })}`

  return { primary, secondary }
}

export function inviteStatusLabel(status: ClientInviteStatus): {
  primary: string
  secondary: string
} {
  switch (status) {
    case 'accepted':
      return { primary: 'Linked', secondary: 'Can log in to client portal' }
    case 'pending':
      return { primary: 'Pending', secondary: 'Invite sent, awaiting signup' }
    case 'not_invited':
      return { primary: 'No account', secondary: 'Send invite from account card' }
  }
}

export function statusLabel(status: ClientStatus): {
  primary: string
  secondary: string
} {
  switch (status) {
    case 'active':
      return { primary: 'Active', secondary: 'Currently in your care' }
    case 'paused':
      return { primary: 'Paused', secondary: 'Sessions temporarily on hold' }
    case 'archived':
      return { primary: 'Archived', secondary: 'No longer an active client' }
  }
}

export function getPreSessionInsight(
  client: Client,
  hasProgram = false,
  hasScheduledWorkouts = false
): {
  badge: string
  variant: 'success' | 'warning' | 'secondary' | 'outline'
  message: string
} {
  if (client.status === 'paused') {
    return {
      badge: 'On hold',
      variant: 'warning',
      message:
        'Client is paused — confirm they are returning before today’s session.',
    }
  }
  if (client.status === 'archived') {
    return {
      badge: 'Archived',
      variant: 'outline',
      message: 'This client is archived and not on an active program.',
    }
  }
  if (client.invite_status === 'pending') {
    return {
      badge: 'Invite pending',
      variant: 'warning',
      message: 'Account invite sent — client has not signed up yet.',
    }
  }
  if (client.invite_status === 'not_invited') {
    return {
      badge: 'No account',
      variant: 'secondary',
      message:
        'Client cannot log workouts until you send an account invite.',
    }
  }
  if (!hasProgram && !hasScheduledWorkouts) {
    return {
      badge: 'No plan',
      variant: 'warning',
      message:
        'No program or calendar workouts yet — schedule sessions on the Calendar tab.',
    }
  }
  if (!hasScheduledWorkouts) {
    return {
      badge: 'No sessions',
      variant: 'warning',
      message:
        'Program assigned but no workouts on the calendar yet — add workouts to the program calendar or schedule sessions manually.',
    }
  }
  return {
    badge: 'Ready to train',
    variant: 'success',
    message:
      'Workouts scheduled on the calendar — review the week before your next session.',
  }
}

type SessionReadinessInput = {
  label: string
  variant: 'success' | 'warning' | 'danger' | 'secondary'
  flags: string[]
}

export function getSessionReadinessInsight(readiness: SessionReadinessInput): {
  badge: string
  variant: 'success' | 'warning' | 'secondary' | 'outline'
  message: string
} {
  if (readiness.label === 'Low' || readiness.variant === 'danger') {
    return {
      badge: 'Check before training',
      variant: 'warning',
      message:
        readiness.flags.length > 0
          ? `Recent check-in flags: ${readiness.flags.join(', ').toLowerCase()}. Review before today's session.`
          : 'Readiness is low — review recovery and check-in notes before training.',
    }
  }

  if (readiness.variant === 'warning' || readiness.flags.length > 0) {
    return {
      badge: 'Monitor readiness',
      variant: 'warning',
      message:
        readiness.flags.length > 0
          ? `Watch for ${readiness.flags.join(', ').toLowerCase()} — adjust volume or intensity if needed.`
          : 'Readiness is moderate — confirm how they feel before pushing intensity.',
    }
  }

  if (readiness.label === 'No data') {
    return {
      badge: 'Review metrics',
      variant: 'secondary',
      message:
        'Not enough recent activity — ask for a check-in before your next session.',
    }
  }

  return {
    badge: 'Ready to train',
    variant: 'success',
    message:
      'Workouts scheduled and readiness looks good — review the week before your next session.',
  }
}

export function getWeekDays(): { label: string; isToday: boolean }[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
  const today = new Date()
  const dayIndex = today.getDay()
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex

  return labels.map((label, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + mondayOffset + index)
    return {
      label,
      isToday: date.toDateString() === today.toDateString(),
    }
  })
}

export function formatRelativeUpdated(updatedAt: string): string {
  const updated = new Date(updatedAt)
  const now = new Date()
  const days = Math.floor((now.getTime() - updated.getTime()) / 86_400_000)

  if (days < 1) return 'Updated today'
  if (days === 1) return 'Updated yesterday'
  if (days < 7) return `Updated ${days} days ago`
  return `Updated ${updated.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`
}
