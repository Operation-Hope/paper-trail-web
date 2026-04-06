// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
// Look for your worker.start() call

// src/mocks/browser.ts (or wherever you call worker.start)

worker.start({
  serviceWorker: {
    url: '/mockServiceWorker.js',
  },
  // 🛡️ THE FIX: Only use the function version to handle the logic
  onUnhandledRequest(request, print) {
    if (request.url.includes('huggingface.co')) {
      return; // Silent bypass for our data files
    }
    print.warning(); // Warn for anything else
  },
});