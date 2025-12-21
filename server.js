/* eslint-env node */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Get API target from environment variable
// In Railway, this will be the internal service URL
const API_TARGET = process.env.VITE_API_BASE_URL || 'http://paper-trail-api.railway.internal';

console.log(`Starting server...`);
console.log(`Node version: ${process.version}`);
console.log(`Working directory: ${process.cwd()}`);
console.log(`__dirname: ${__dirname}`);
console.log(`Proxying /api requests to: ${API_TARGET}`);

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');
console.log(`Dist directory exists: ${existsSync(distPath)}`);
console.log(`Index.html exists: ${existsSync(indexPath)}`);

// Proxy API requests to backend
app.use(
  '/api',
  createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    secure: false,
    onProxyReq: (proxyReq, req) => {
      console.log(`[Proxy] ${req.method} ${req.path} -> ${API_TARGET}${req.path}`);
    },
    onError: (err, req, res) => {
      console.error('[Proxy Error]', err.message);
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Failed to connect to API service',
      });
    },
  })
);

// Health check endpoint (before static files to ensure it responds)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React Router - send remaining GET requests to index.html
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    return;
  }
  next();
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Frontend server running on port ${PORT}`);
  console.log(`✓ API proxy target: ${API_TARGET}`);
  console.log(`✓ Server ready to accept connections`);
});

server.on('error', (error) => {
  console.error(`✗ Server error:`, error);
  process.exit(1);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`✗ Uncaught exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`✗ Unhandled rejection at:`, promise, 'reason:', reason);
  process.exit(1);
});
