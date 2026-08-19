'use client';

import { useEffect } from 'react';
import { BASE_PATH } from '@/lib/base-path';

const REQUIRED_SW_VERSION = 3;
// En GitHub Pages el SW vive bajo el basePath; en local, en la raíz.
const SW_URL = `${BASE_PATH}/sw.js`;

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // First, check if there's an old service worker and force update
      navigator.serviceWorker.getRegistration(SW_URL).then(async (existingReg) => {
        if (existingReg) {
          // Force the service worker to update
          await existingReg.update();
          // If there's a waiting SW, skip waiting
          if (existingReg.waiting) {
            existingReg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }

        // Register the service worker
        const registration = await navigator.serviceWorker.register(SW_URL, {
          updateViaCache: 'none',
        });

        console.log('SW registered:', registration.scope, 'version: v' + REQUIRED_SW_VERSION);

        // Listen for new SW waiting to activate
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW installed, skip waiting to activate immediately
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        // When new SW takes control, reload to get fresh cached content
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!reloaded) {
            reloaded = true;
            window.location.reload();
          }
        });
      }).catch((err) => {
        console.log('SW registration failed:', err);
      });
    }
  }, []);

  return null;
}
