export type BodyweightSource = 'inbody' | 'check_in'

export type BodyweightEntry = {
  dateKey: string
  weightLbs: number
  source: BodyweightSource
}

type InbodyScanRow = {
  scan_date: string
  weight_lbs: number
}

type CheckInRow = {
  check_in_date: string
  weight: number | null
}

export function buildBodyweightTimeline(
  scans: InbodyScanRow[],
  checkIns: CheckInRow[]
): BodyweightEntry[] {
  const entries: BodyweightEntry[] = []

  for (const scan of scans) {
    entries.push({
      dateKey: scan.scan_date.slice(0, 10),
      weightLbs: scan.weight_lbs,
      source: 'inbody',
    })
  }

  for (const checkIn of checkIns) {
    if (checkIn.weight == null) continue
    entries.push({
      dateKey: checkIn.check_in_date,
      weightLbs: checkIn.weight,
      source: 'check_in',
    })
  }

  entries.sort((left, right) => {
    const dateCompare = left.dateKey.localeCompare(right.dateKey)
    if (dateCompare !== 0) return dateCompare
    if (left.source === right.source) return 0
    return left.source === 'check_in' ? -1 : 1
  })

  return entries
}

export function getBodyweightAtDate(
  timeline: BodyweightEntry[],
  dateKey: string
): BodyweightEntry | null {
  let latest: BodyweightEntry | null = null

  for (const entry of timeline) {
    if (entry.dateKey > dateKey) break
    latest = entry
  }

  return latest
}
