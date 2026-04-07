import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeVotes } from './mocks/data/factories/vote';

async function prepareApp() {
  // 🛡️ Trigger DuckDB init but don't 'await' it here to prevent white screens
  initializeVotes().catch((err) =>
    console.error('Database failed to start:', err)
  );

  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest(req, print) {
        // 🛡️ Ensure Hugging Face data bypasses the mock worker
        if (req.url.includes('huggingface.co')) return;
        if (req.url.includes('/api/')) print.warning();
      },
    });
  }
}

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  // Render the App immediately so the UI shows up
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // Start background services
  void prepareApp();
}
