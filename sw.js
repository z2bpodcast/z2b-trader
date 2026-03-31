// Z2B TRADING COMMAND CENTRE — SERVICE WORKER v3
const CACHE_NAME = 'z2b-trader-v3';
const OFFLINE_URL = '/index.html';

const CACHE_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CACHE_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('twelvedata.com')) return;
  if (event.request.url.includes('faireconomy.media')) return;
  if (event.request.url.includes('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: '🔔 Z2B Signal Alert!', body: 'All 7 gates passed — open Z2B Trader now.', url: '/' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch(e) { data.body = event.data.text(); }
  }
  const isBuy  = data.signal === 'BUY';
  const isSell = data.signal === 'SELL';
  const emoji  = isBuy ? '🟢' : isSell ? '🔴' : '🔔';
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [300, 100, 300, 100, 300, 100, 600],
      data: { url: data.url || '/' },
      actions: [
        { action: 'open',    title: emoji + ' Open App' },
        { action: 'dismiss', title: '✕ Dismiss' }
      ],
      requireInteraction: true,
      tag: 'z2b-signal-' + (data.pair || 'alert'),
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

console.log('[Z2B SW v3] Loaded — 7-Gate Trading System');
