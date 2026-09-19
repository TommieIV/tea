/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<unknown> }

clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') void self.skipWaiting()
})

self.addEventListener('push', (event) => {
  const payload = event.data?.json() as { title?: string; body?: string; url?: string; tag?: string } | undefined
  event.waitUntil(self.registration.showNotification(payload?.title ?? 'TEA', {
    body: payload?.body ?? 'You have a new TEA notification.',
    icon: '/tea_fav.png',
    badge: '/tea_fav.png',
    tag: payload?.tag,
    data: { url: payload?.url ?? '/dashboard' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data as { url?: string } | undefined)?.url ?? '/dashboard', self.location.origin).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((window) => 'focus' in window)
    return existing ? existing.focus() : self.clients.openWindow(target)
  }))
})
