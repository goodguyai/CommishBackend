import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function startMockServiceWorker() {
  if (typeof window === 'undefined') {
    return;
  }

  return worker.start({
    onUnhandledRequest: 'bypass',
    quiet: false,
  });
}
