export function isMissingMessagesTableError(message: string) {
  return (
    message.includes('Could not find the table') &&
    (message.includes('client_messages') ||
      message.includes('client_message_threads'))
  )
}

export function formatMessageTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  if (isToday) return time
  if (isYesterday) return `Yesterday ${time}`

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
