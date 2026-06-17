const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDayHeader(dateKey: string): string {
  const date = parseDateKey(dateKey)
  const day = date.getDate()
  const weekday = WEEKDAY_LABELS[date.getDay()]
  return `${day} ${weekday}`
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_LABELS[month]} ${year}`
}

export function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toDateKey(new Date())

  const cells: Array<{
    dateKey: string | null
    day: number | null
    isToday: boolean
  }> = []

  for (let i = 0; i < startOffset; i++) {
    cells.push({ dateKey: null, day: null, isToday: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(new Date(year, month, day))
    cells.push({
      dateKey,
      day,
      isToday: dateKey === todayKey,
    })
  }

  return cells
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function getMonthDateRange(year: number, month: number) {
  const start = toDateKey(new Date(year, month, 1))
  const end = toDateKey(new Date(year, month + 1, 0))
  return { start, end }
}

export function formatPrescription(
  sets: string | null,
  reps: string | null,
  prescription: string | null
): string {
  const parts: string[] = []
  if (sets?.trim() && reps?.trim()) {
    parts.push(`${sets.trim()} x ${reps.trim()}`)
  } else if (sets?.trim()) {
    parts.push(sets.trim())
  } else if (reps?.trim()) {
    parts.push(reps.trim())
  }
  if (prescription?.trim()) {
    parts.push(prescription.trim())
  }
  return parts.join(' · ') || 'No prescription set'
}

export function getCurrentWeekDateKeys(): string[] {
  const today = new Date()
  const dayIndex = today.getDay()
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + mondayOffset + index)
    return toDateKey(date)
  })
}

export function getWeekDayLabels(): { label: string; dateKey: string; isToday: boolean }[] {
  const todayKey = toDateKey(new Date())
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

  return getCurrentWeekDateKeys().map((dateKey, index) => ({
    label: labels[index],
    dateKey,
    isToday: dateKey === todayKey,
  }))
}
