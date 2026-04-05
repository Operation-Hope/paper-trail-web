import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeVotes } from './mocks/data/factories/vote';

async function prepareApp() {
  // 1. Initialize the SQL Engine
  await initializeVotes();

  // 2. Enable MSW with surgical bypass rules for DuckDB/HuggingFace
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser');

    return worker.start({
      onUnhandledRequest(req, print) {
        const url = new URL(req.url);

        // Bypass MSW for binary data and external database assets
        const shouldBypass =
          url.hostname.includes('huggingface.co') ||
          url.hostname.includes('jsdelivr.net') ||
          url.pathname.endsWith('.wasm') ||
          url.pathname.endsWith('.parquet') ||
          url.pathname.includes('worker');

        if (shouldBypass) return;

        // Warn for our own API mistakes
        if (url.pathname.startsWith('/api')) {
          print.warning();
        }
      },
    });
  }
}

const container = document.getElementById('root');

// Find the bottom of your file where you call prepareApp
if (container) {
  // Add 'void' here to tell ESLint you're intentionally not awaiting this
  void prepareApp().then(() => {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
}
