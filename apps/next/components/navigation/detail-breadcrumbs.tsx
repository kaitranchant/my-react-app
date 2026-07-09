'use client'

import { useSearchParams } from 'next/navigation'

import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/breadcrumbs'

const TEAM_TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  schedule: 'Schedule',
  members: 'Members',
  program: 'Program',
}

const CLIENT_TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  training: 'Training',
  progress: 'Progress',
  messages: 'Messages',
}

type TeamDetailBreadcrumbsProps = {
  teamId: string
  teamName: string
}

export function TeamDetailBreadcrumbs({
  teamId,
  teamName,
}: TeamDetailBreadcrumbsProps) {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'overview'
  const tabLabel = TEAM_TAB_LABELS[tab]

  const items: BreadcrumbItem[] = [{ label: 'Teams', href: '/teams' }]

  if (tab === 'overview' || !tabLabel) {
    items.push({ label: teamName })
  } else {
    items.push({ label: teamName, href: `/teams/${teamId}` })
    items.push({ label: tabLabel })
  }

  return <Breadcrumbs items={items} />
}

type ClientDetailBreadcrumbsProps = {
  clientId: string
  clientName: string
}

export function ClientDetailBreadcrumbs({
  clientId,
  clientName,
}: ClientDetailBreadcrumbsProps) {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'overview'
  const tabLabel = CLIENT_TAB_LABELS[tab]

  const items: BreadcrumbItem[] = [{ label: 'Users', href: '/clients' }]

  if (tab === 'overview' || !tabLabel) {
    items.push({ label: clientName })
  } else {
    items.push({ label: clientName, href: `/clients/${clientId}` })
    items.push({ label: tabLabel })
  }

  return <Breadcrumbs items={items} />
}

type ProgramDetailBreadcrumbsProps = {
  programName: string
}

export function ProgramDetailBreadcrumbs({
  programName,
}: ProgramDetailBreadcrumbsProps) {
  return (
    <Breadcrumbs
      items={[
        { label: 'Library', href: '/library' },
        { label: 'Programs', href: '/library/programs' },
        { label: programName },
      ]}
    />
  )
}

type GymScopeBreadcrumbsProps = {
  gyms: { id: string; name: string }[]
}

export function GymScopeBreadcrumbs({ gyms }: GymScopeBreadcrumbsProps) {
  const searchParams = useSearchParams()

  if (gyms.length <= 1) {
    return null
  }

  const gymIds = gyms.map((gym) => gym.id)
  const rawGym = searchParams.get('gym') ?? gyms[0]?.id ?? ''
  const selectedGymId = gymIds.includes(rawGym) ? rawGym : gyms[0]?.id ?? ''
  const selectedGym = gyms.find((gym) => gym.id === selectedGymId)

  if (!selectedGym) {
    return null
  }

  return (
    <Breadcrumbs
      items={[
        { label: 'Gyms', href: '/gym' },
        { label: selectedGym.name },
      ]}
    />
  )
}

type GymJoinBreadcrumbsProps = {
  gymName?: string
}

export function GymJoinBreadcrumbs({ gymName }: GymJoinBreadcrumbsProps) {
  return (
    <Breadcrumbs
      items={[
        { label: 'Gyms', href: '/gym' },
        { label: gymName ? `Join ${gymName}` : 'Join' },
      ]}
    />
  )
}
