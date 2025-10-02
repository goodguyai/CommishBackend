import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { FEATURES } from './lib/config';
import { startMockServiceWorker } from './mocks/browser';

async function enableMocking() {
  if (FEATURES.MOCK_MODE && typeof window !== 'undefined') {
    return startMockServiceWorker();
  }
  return Promise.resolve();
}

enableMocking()
  .catch((error) => {
    console.error('[App] Failed to initialize mocking:', error);
  })
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
