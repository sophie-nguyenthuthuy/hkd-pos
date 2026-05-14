import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'test/unit/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.ts'] },
  },
  resolve: {
    alias: { '@': new URL('./src/', import.meta.url).pathname },
  },
});
