self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() ?? {}
  const title = payload.title ?? 'Coaching App'
  const options = {
    body: payload.body ?? '',
    icon: '/vercel.svg',
    tag: payload.tag,
    data: {
      url: payload.url ?? '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/'
  const absoluteUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus()
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl)
      }

      return undefined
    })
  )
})
