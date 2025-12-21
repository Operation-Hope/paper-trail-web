import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    'src/main.tsx',
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
  ],
  project: ['src/**/*.{ts,tsx}'],
  ignore: [
    'dist/**',
    'node_modules/**',
    '**/*.d.ts',
  ],
  ignoreDependencies: [
    '@tailwindcss/forms',
    '@tailwindcss/typography',
    'shadcn',
    'tailwindcss',
    'tw-animate-css',
  ],
  paths: {
    '@/*': ['./src/*'],
  },
  vite: {
    config: 'vite.config.ts',
  },
};

export default config;

