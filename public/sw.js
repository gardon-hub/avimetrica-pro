const CACHE_NAME = 'avimetrica-pro-v7';

// Base del despliegue, derivada de la URL del propio SW: '' cuando vive en
// la raíz (desarrollo local) y '/avimetrica-pro' en GitHub Pages. Así el
// mismo archivo sirve en ambos sin editarlo.
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');

const OFFLINE_URLS = [
  `${BASE}/`,
  `${BASE}/logo-avimetrica.png`,
  `${BASE}/icon-192.png`,
];

// Extensions that should always be fetched from network first (code updates)
const NETWORK_FIRST_EXTENSIONS = ['.js', '.mjs', '.css', '.ts', '.tsx'];

// Límite de espera de la red al navegar antes de recurrir a la caché.
const NAVIGATION_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Handle SKIP_WAITING message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls - they need network
  if (event.request.url.includes('/api/')) return;

  const url = new URL(event.request.url);

  // Network-first for page navigations.
  //
  // Antes se atendían con cache-first y eso servía un shell HTML viejo tras
  // cada despliegue: el HTML en caché apuntaba a chunks que ya no existían,
  // la página no hidrataba y solo se arreglaba recargando por segunda vez.
  // Ahora la red manda y la caché es solo el respaldo sin conexión.
  //
  // El tiempo límite existe porque la app se usa en galera con wifi flojo:
  // sin él, una conexión que no responde deja la página colgada en blanco.
  // 3 s es holgado para la red local (una carga real toma ~120 ms) y corto
  // frente a una conexión muerta.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), NAVIGATION_TIMEOUT_MS);
        fetch(event.request).then(
          (response) => { clearTimeout(timeout); resolve(response); },
          (error) => { clearTimeout(timeout); reject(error); }
        );
      })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Sin red: la propia página si se visitó antes (ignorando la query,
          // que no cambia el HTML servido), y si no, el índice precargado.
          return caches.match(event.request, { ignoreSearch: true })
            .then((cached) => cached || caches.match(`${BASE}/`));
        })
    );
    return;
  }

  // Network-first for JS/CSS bundles (ensures code updates are always fresh)
  const isCodeAsset = NETWORK_FIRST_EXTENSIONS.some(ext => url.pathname.endsWith(ext)) ||
    url.pathname.includes('/_next/') ||
    url.pathname.includes('/chunks/');

  if (isCodeAsset) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for static assets (images, fonts, etc.) — aquí ya no llegan
  // navegaciones ni código: las atienden las dos ramas de arriba.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache, but also update cache in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
