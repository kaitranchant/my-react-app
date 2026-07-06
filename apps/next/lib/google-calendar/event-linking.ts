export function intervalsOverlap(
  aStartIso: string,
  aEndIso: string,
  bStartIso: string,
  bEndIso: string
) {
  return (
    new Date(aStartIso).getTime() < new Date(bEndIso).getTime() &&
    new Date(aEndIso).getTime() > new Date(bStartIso).getTime()
  )
}

/** Match exact IDs and Google recurring instance IDs (baseId_occurrenceKey). */
export function isLinkedCoachingGoogleEvent(
  eventId: string,
  linkedEventIds: Set<string>
) {
  if (linkedEventIds.has(eventId)) {
    return true
  }

  const underscoreIndex = eventId.indexOf('_')
  if (underscoreIndex > 0) {
    const baseId = eventId.slice(0, underscoreIndex)
    if (linkedEventIds.has(baseId)) {
      return true
    }
  }

  for (const linkedId of Array.from(linkedEventIds)) {
    if (eventId.startsWith(`${linkedId}_`)) {
      return true
    }
  }

  return false
}
