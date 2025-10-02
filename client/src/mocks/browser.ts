import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function startMockServiceWorker() {
  if (typeof window === 'undefined') {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[MSW] Service Worker not supported in this environment. Mock API disabled.');
    return;
  }

  try {
    return await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: false,
    });
  } catch (error) {
    console.error('[MSW] Failed to start service worker:', error);
    return;
  }
}
