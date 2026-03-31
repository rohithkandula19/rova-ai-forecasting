/**
 * ROVA Service Worker — Push Notifications
 * Receives push events when new lottery draws are posted.
 * Works on HTTPS (Vercel / GCP Cloud Run with custom domain).
 */

const CACHE_NAME = 'rova-v1'

// Install — cache app shell
self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim())
})

// Push event — show notification
self.addEventListener('push', (e) => {
  if (!e.data) return

  let data = {}
  try { data = e.data.json() } catch { data = { title: 'ROVA', body: e.data.text() } }

  const options = {
    body:    data.body || 'New lottery draw results are in!',
    icon:    '/icon-192.png',
    badge:   '/icon-96.png',
    tag:     data.tag || 'draw-result',
    data:    { url: data.url || '/' },
    actions: [
      { action: 'view',    title: 'View Results' },
      { action: 'dismiss', title: 'Dismiss'      },
    ],
    requireInteraction: false,
    silent: false,
  }

  e.waitUntil(
    self.registration.showNotification(data.title || 'ROVA — Draw Results', options)
  )
})

// Notification click — open app
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  if (e.action === 'dismiss') return

  const url = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
