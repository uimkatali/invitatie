import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import bcrypt from 'bcryptjs';
import { E2E_USERS } from './e2e/users';

// Incarca .env.test.local (Next il citeste doar cand NODE_ENV=test).
const previousNodeEnv = process.env.NODE_ENV;
Object.assign(process.env, { NODE_ENV: 'test' });
loadEnvConfig(process.cwd());
// Atentie: process.env.X = undefined ar seta textul "undefined", deci variabila se sterge explicit.
if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
else Object.assign(process.env, { NODE_ENV: previousNodeEnv });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('Seteaza TEST_DATABASE_URL in .env.test.local (vezi SETUP.md, pasul 4).');
}

const PORT = 3100;
const hash = (password: string) => Buffer.from(bcrypt.hashSync(password, 12)).toString('base64');

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  // Baza de test e un TiDB Cloud la distanta (driver HTTP): actiunile serverului pot dura cateva secunde.
  expect: { timeout: 15_000 },
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Chromium headless randeaza WebGL in software (SwiftShader): scena completa (bloom, mii de particule) blocheaza
    // firul principal si face testele lente si instabile. Cu reduced motion scena ruleaza usor, iar titlul
    // invitatiei apare imediat. Testele care vor scena completa folosesc test.use({ reducedMotion: 'no-preference' }).
    reducedMotion: 'reduce',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: testDatabaseUrl,
      SESSION_SECRET: 'e2e-session-secret-'.padEnd(48, 'x'),
      USER_EL_NAME: E2E_USERS.el.name,
      USER_EL_PASSWORD_HASH: hash(E2E_USERS.el.password),
      USER_EA_NAME: E2E_USERS.ea.name,
      USER_EA_PASSWORD_HASH: hash(E2E_USERS.ea.password),
      EMAIL_EL: 'el@example.com',
      EMAIL_EA: '',
      // Cheie invalida intentionat: emailul esueaza, e logat, iar actiunea merge mai departe.
      RESEND_API_KEY: 're_e2e_invalid',
      BLOB_READ_WRITE_TOKEN: process.env.E2E_BLOB_READ_WRITE_TOKEN ?? 'e2e-no-blob',
      APP_URL: `http://localhost:${PORT}`,
    },
  },
});
