// Minimal Service Worker for PWA installation requirements
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A simple pass-through fetch handler is enough to pass the PWA install criteria
  // You can implement caching strategies here for offline support
  event.respondWith(fetch(event.request).catch(() => new Response("Offline mode not fully implemented.")));
});
