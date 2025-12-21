/**
 * Environment configuration
 *
 * API_BASE_URL is configured via VITE_API_BASE_URL environment variable:
 * - Development: empty string (proxied through Vite dev server at /api)
 * - Production: empty string (proxied through Express server at /api)
 *
 * The actual backend target is configured in:
 * - Development: vite.config.ts server.proxy
 * - Production: server.js proxy middleware (uses Railway internal networking)
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// No validation needed - proxy handles routing in all environments
