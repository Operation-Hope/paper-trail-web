import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
// 🚀 FIXED: Pointing to the new lib folder
import { initializeDatabase } from './lib/duckdb';

const queryClient = new QueryClient();

async function prepareApp() {
  initializeDatabase().catch((err: Error) =>
    console.error('DuckDB failed to initialize:', err)
  );
}

// ... (The rest of your ReactDOM.createRoot logic remains the same)

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );

  void prepareApp();
}