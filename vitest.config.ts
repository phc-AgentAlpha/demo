import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).pathname,
    },
  },
});
