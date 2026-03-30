// ═══════════════════════════════════════════════
// Z2B TRADING COMMAND CENTRE — SERVICE WORKER
// Version: 1.0.0
// ═══════════════════════════════════════════════

const CACHE_NAME = 'z2b-trader-v1';
const OFFLINE_URL = '/index.html';

// Files to cache for offline use
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Google Fonts - cache after first load
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&display=swap',
];

// ── INSTALL ──────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[Z2B SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Z2B SW] Caching app shell');
      // Cache what we can — fonts may fail, that's ok
      return Promise.allSettled(
        CACHE_ASSETS.map(url => cache.add(url).catch(err => {
          console.log('[Z2B SW] Failed to cache:', url, err);
        }))
      );
    }).then(() => {
      console.log('[Z2B SW] Install complete');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE ─────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[Z2B SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[Z2B SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[Z2B SW] Activated — claiming clients');
      return self.clients.claim();
    })
  );
});

// ── FETCH — Cache First, Network Fallback ────
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Twelve Data API calls — always need live data
  if (event.request.url.includes('twelvedata.com')) return;

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version, update in background
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse;
      }

      // Not in cache — try network
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        // Cache the new resource
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      }).catch(() => {
        // Offline — return the app shell
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: '🔔 Z2B Signal Alert!', body: 'A confluence signal has fired. Open Z2B Trader now.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 400],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: true,
    tag: 'z2b-signal',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── NOTIFICATION CLICK ────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// ── MESSAGE HANDLER ───────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Z2B SW] Service Worker loaded — Z2B Trading Command Centre');
