import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

let worker: ReturnType<typeof setupWorker> | null = null;

export async function startMockServiceWorker() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[MSW] Service Worker not supported in this environment. Mock API disabled.');
    return;
  }

  try {
    // Lazy initialization - only create worker when actually starting
    if (!worker) {
      worker = setupWorker(...handlers);
    }
    return await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: false,
    });
  } catch (error) {
    console.error('[MSW] Failed to start service worker:', error);
    return;
  }
}
