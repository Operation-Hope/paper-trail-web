import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..')
  const env = loadEnv(mode, envDir, '')

  const backendPort = env.PORT || process.env.PORT || '5001'

  // Docker Compose uses service name 'backend', local dev uses 'localhost'
  const backendHost = process.env.DOCKER_COMPOSE === 'true' ? 'backend' : 'localhost'

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    envDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://${backendHost}:${backendPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
