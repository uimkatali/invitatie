import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { loadEnvConfig } from '@next/env';

// Vitest ruleaza cu NODE_ENV=test, deci Next incarca .env.test.local (nu .env.local).
loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    globalSetup: ['./test/global-setup.ts'],
    // Testele de integrare impart aceeasi baza de test.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
