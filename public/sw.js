const CACHE_NAME = 'classlogs-v4';
const STATIC_ASSETS = [
  '/',
  '/admin-dashboard',
  '/teacher-dashboard',
  '/bursar-dashboard',
  '/discipline-master-dashboard',
  '/principal-dashboard',
  '/supervisor-dashboard',
  '/student-dashboard',
  '/manifest.json',
  '/favicon.ico',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ Caching ClassLogs complete platform shell...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Leave external API, Supabase domain, REST endpoints, and Storage calls completely untouched
  if (
    url.origin !== self.location.origin ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/rest/v1') ||
    url.pathname.includes('/storage/v1') ||
    url.pathname.startsWith('/api') ||
    event.request.url.startsWith('data:image')
  ) {
    return;
  }

  // 2. Handle page requests: fetch live when online, serve from local cache when offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match('/');
        });
      })
  );
});