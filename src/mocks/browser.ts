import { setupWorker } from 'msw/browser';
import { http, passthrough } from 'msw';
import { handlers } from './handlers';

// 🚀 NETWORK FIX: Explicitly allow DuckDB to stream data without MSW interference
const bypassHandlers = [
  http.all('https://huggingface.co/*', () => passthrough()),
  http.all('https://*.huggingface.co/*', () => passthrough()),
  http.all('https://voteview.com/*', () => passthrough()),
];

export const worker = setupWorker(...bypassHandlers, ...handlers);

worker.start({
  onUnhandledRequest(req: Request, print: { warning: () => void }) {
    const url = req.url.toString();
    if (url.includes('huggingface.co') || url.includes('voteview.com')) return;
    print.warning();
  },
});