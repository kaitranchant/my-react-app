import type { ClientDetailMainTab } from '@/components/clients/client-detail-tab-skeletons'

const MAIN_TABS = ['overview', 'training', 'progress', 'messages'] as const

export function resolveClientDetailMainTab(
  tab: string | null | undefined
): ClientDetailMainTab {
  if (tab && MAIN_TABS.includes(tab as ClientDetailMainTab)) {
    return tab as ClientDetailMainTab
  }
  if (tab === 'calendar' || tab === 'programs') {
    return 'training'
  }
  if (
    tab === 'check-ins' ||
    tab === 'progress-photos' ||
    tab === 'form-reviews' ||
    tab === 'inbody' ||
    tab === 'goals'
  ) {
    return 'progress'
  }
  if (tab === 'notes') {
    return 'overview'
  }
  return 'overview'
}
