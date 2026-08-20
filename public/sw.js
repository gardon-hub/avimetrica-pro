// Service worker de Avimétrica Pro.
//
// DISEÑO PARA USO EN CAMPO (sin internet):
// - En la primera visita con conexión se PRECARGA el sitio completo (los
//   tres módulos con todos sus chunks): la lista la inyecta el build en
//   PRECACHE (scripts/generar-precache.mjs). Desde entonces la app abre
//   sin señal, incluidas rutas que nunca se visitaron en línea.
// - Las NAVEGACIONES van network-first con límite de 3 s y caché de
//   respaldo. NO cambiar a cache-first: servía shells viejos con chunks
//   muertos tras cada despliegue (la página no hidrataba); y sin el límite,
//   un wifi flojo que no responde deja la página en blanco.
// - Los assets de /_next/static llevan hash en el nombre (inmutables) y la
//   caché se estrena por build (BUILD_ID): ahí cache-first es correcto y
//   más rápido en galera con señal floja.
//
// En desarrollo (next dev) los marcadores quedan vacíos: sin precarga.

const PRECACHE = [];
const BUILD_ID = 'dev';
const CACHE_NAME = `avimetrica-pro-${BUILD_ID}`;

// Base del despliegue, derivada de la URL del propio SW: '' cuando vive en
// la raíz (desarrollo local) y '/avimetrica-pro' en GitHub Pages. Así el
// mismo archivo sirve en ambos sin editarlo.
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');

// Límite de espera de la red al navegar antes de recurrir a la caché.
const NAVIGATION_TIMEOUT_MS = 3000;

/**
 * Descarga y guarda re-empaquetando la respuesta. El re-empaquetado NO es
 * adorno: algunos servidores (p. ej. `serve` con cleanUrls) responden a
 * «ruta/index.html» con una redirección a la URL limpia, y una respuesta
 * con redirected=true servida a una navegación produce un error de red por
 * seguridad. Crear una Response nueva con el mismo cuerpo limpia la marca.
 */
async function precargarUno(cache, ruta) {
  const resp = await fetch(ruta, { cache: 'no-cache' });
  if (!resp.ok) return;
  const cuerpo = await resp.blob();
  await cache.put(ruta, new Response(cuerpo, {
    status: 200,
    headers: { 'Content-Type': resp.headers.get('Content-Type') || '' },
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Por lotes y tolerando fallos por archivo: un tropiezo no debe dejar
      // la app sin el resto de la precarga.
      const rutas = PRECACHE.map((r) => `${BASE}/${r}`);
      const LOTE = 10;
      for (let i = 0; i < rutas.length; i += LOTE) {
        await Promise.all(
          rutas.slice(i, i + LOTE).map((ruta) => precargarUno(cache, ruta).catch(() => {})),
        );
      }
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Solo nuestro propio origen: sin opinar sobre peticiones externas.
  if (url.origin !== self.location.origin) return;

  // Network-first para navegaciones (ver cabecera del archivo).
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
        .catch(async () => {
          // Sin red: la propia página (ignorando la query, que no cambia el
          // HTML), su variante export (/ruta → ruta.html) y, como último
          // recurso, el índice.
          const porUrl = await caches.match(event.request, { ignoreSearch: true });
          if (porUrl) return porUrl;
          // La exportación escribe /ruta como ruta/index.html (o ruta.html):
          // mapear la URL navegada al archivo precargado.
          const limpio = url.pathname.replace(/\/$/, '');
          const porHtml = (await caches.match(`${limpio}/index.html`))
            || (await caches.match(`${limpio}.html`));
          if (porHtml) return porHtml;
          return (await caches.match(`${BASE}/`)) || caches.match(`${BASE}/index.html`);
        })
    );
    return;
  }

  // Cache-first para los assets con hash de /_next/static: son inmutables
  // y están precargados; la red solo entra si faltara alguno.
  if (url.pathname.includes('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Resto (imágenes, manifest, payloads .txt del router): cache-first con
  // actualización en segundo plano.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
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
