# Faza 5: Teste E2E + securitate, ghid de setup - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Nota (actualizare ulterioara):** stratul de email din acest plan (Resend) a fost inlocuit cu Gmail SMTP prin `nodemailer`, pentru ca sandbox-ul Resend trimite doar la proprietarul contului. Codul din repo (`lib/notifications/email.ts`, `lib/env.ts`, `SETUP.md`) este sursa de adevar; blocurile de cod despre email de mai jos sunt istorice si nu se mai aplica. Vezi abaterea 10 din `2026-09-28-date-manager-00-overview.md`.

**Goal:** Teste Playwright pentru fluxurile principale si pentru controalele OWASP, configurarea de deploy (`vercel.json`, Dependabot), checklist de securitate, ghidul pas cu pas `SETUP.md` si README nou.

**Architecture:** Playwright porneste un build de productie (`next start`) pe portul 3100, cu env de test: baza `dates_test`, useri si parole de test generate la pornire, Resend cu cheie invalida (emailul esueaza si e doar logat). Testele seed-uiesc direct in DB ce nu se poate crea prin UI (un date acceptat din trecut). Fiecare test primeste un IP propriu (`x-forwarded-for`) ca rate limit-ul sa nu se scurga intre teste.

**Tech Stack:** @playwright/test, Drizzle (seed), Vercel, GitHub Dependabot.

**Prerequisite:** Fazele 1-4 terminate. Baza `dates_test` creata si `TEST_DATABASE_URL` in `.env.test.local`. Spec sectiunile 10, 12, 13.

---

## File map (Faza 5)

| Fisier | Responsabilitate |
|---|---|
| `playwright.config.ts` | server de test, env, browsere |
| `e2e/users.ts` | credentialele userilor de test |
| `e2e/global-setup.ts` | migrari + golire baza de test |
| `e2e/helpers.ts` | login, logout, IP unic, date viitoare |
| `e2e/flow.spec.ts` | fluxuri: invitatie, amintire, idee |
| `e2e/security.spec.ts` | teste OWASP |
| `vercel.json` | regiunea functiilor |
| `.github/dependabot.yml` | update-uri de dependente |
| `docs/security-checklist.md` | verificari manuale inainte de deploy |
| `SETUP.md` | ghid pas cu pas |
| `README.md` | rescris |
| `.gitignore` | + artefacte Playwright |

---

### Task 1: Configurare Playwright

**Files:**
- Create: `playwright.config.ts`, `e2e/users.ts`, `e2e/global-setup.ts`, `e2e/helpers.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Instaleaza browserul**

Run: `npx playwright install chromium`
Expected: descarca Chromium (~150 MB), fara erori.

- [ ] **Step 2: Scrie `e2e/users.ts`**

```ts
export const E2E_USERS = {
  el: { name: 'el-test', password: 'parola-el-e2e-123' },
  ea: { name: 'ea-test', password: 'parola-ea-e2e-123' },
} as const;

export type E2EUser = keyof typeof E2E_USERS;
```

- [ ] **Step 3: Scrie `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import bcrypt from 'bcryptjs';
import { E2E_USERS } from './e2e/users';

// Incarca .env.test.local (Next il citeste doar cand NODE_ENV=test).
const previousNodeEnv = process.env.NODE_ENV;
Object.assign(process.env, { NODE_ENV: 'test' });
loadEnvConfig(process.cwd());
Object.assign(process.env, { NODE_ENV: previousNodeEnv });

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
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
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
```

- [ ] **Step 4: Scrie `e2e/global-setup.ts`**

```ts
import applyMigrations from '../test/global-setup';
import { testDb, resetDb } from '../test/db';

export default async function globalSetup() {
  await applyMigrations();
  await resetDb(testDb());
}
```

- [ ] **Step 5: Scrie `e2e/helpers.ts`**

```ts
import { expect, type Page } from '@playwright/test';
import { toLocalInputValue } from '@/lib/time';
import { E2E_USERS, type E2EUser } from './users';

let ipCounter = 0;

/** Fiecare test are propriul IP, ca rate limit-ul de login sa nu afecteze alte teste. */
export async function useFreshIp(page: Page): Promise<string> {
  ipCounter += 1;
  const ip = `10.${Math.floor(ipCounter / 250) % 250}.${ipCounter % 250}.${Date.now() % 250}`;
  await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': ip });
  return ip;
}

export async function login(page: Page, who: E2EUser): Promise<void> {
  await useFreshIp(page);
  await page.goto('/login');
  await page.getByLabel('Utilizator').fill(E2E_USERS[who].name);
  await page.getByLabel('Parola').fill(E2E_USERS[who].password);
  await page.getByRole('button', { name: 'Intra' }).click();
  await expect(page).toHaveURL('/');
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Iesi' }).click();
  await expect(page).toHaveURL('/login');
}

export function futureLocal(days: number): string {
  return toLocalInputValue(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

/** PNG valid de 1x1 pixeli. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
```

- [ ] **Step 6: Adauga in `.gitignore`**

```
test-results/
playwright-report/
```

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e .gitignore
git commit -m "test: add Playwright setup with isolated test database"
```

---

### Task 2: Teste de flux

**Files:**
- Create: `e2e/flow.spec.ts`

- [ ] **Step 1: Scrie `e2e/flow.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { testDb } from '../test/db';
import { seedInvitation } from '../test/fixtures';
import { login, logout, futureLocal, TINY_PNG } from './helpers';

test('invitation: create, propose another time, accept the proposal', async ({ page }) => {
  await login(page, 'el');
  await page.getByRole('link', { name: 'Invitatie noua' }).click();
  await page.getByLabel('Titlu').fill('Cina E2E');
  await page.getByLabel('Mesaj').fill('Te astept\nCu drag');
  await page.getByLabel('Unde').fill('Acasa');
  await page.getByLabel('Cand').fill(futureLocal(5));
  await page.getByText('Iarna baby blue').click();
  await page.getByRole('button', { name: 'Trimite invitatia' }).click();
  await expect(page.getByRole('heading', { name: 'Cina E2E' })).toBeVisible();
  const invitationUrl = page.url();
  await logout(page);

  await login(page, 'ea');
  await expect(page.getByText('1 necitite')).toBeAttached();
  await page.goto(invitationUrl);
  await expect(page.locator('.exp-title')).toHaveText('Cina E2E');
  await page.getByText('Propun alta ora').click();
  await page.getByLabel('Ce ora ti-ar conveni?').fill(futureLocal(6));
  await page.getByRole('button', { name: 'Trimite raspunsul' }).click();
  await expect(page.locator('.status')).toHaveText('Alta ora propusa');
  await logout(page);

  await login(page, 'el');
  await page.goto(invitationUrl);
  await page.getByRole('button', { name: 'Accept ora propusa' }).click();
  await expect(page.locator('.status')).toHaveText('Acceptata');
  await page.goto('/');
  await expect(page.getByText('Urmatorul date')).toBeVisible();
});

test('memory: note and rating on a past accepted date', async ({ page }) => {
  const id = await seedInvitation(testDb(), {
    title: 'Picnic trecut',
    startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });
  await login(page, 'ea');
  await page.goto(`/invitatii/${id}`);
  await page.getByLabel('Cum a fost?').fill('A fost superb');
  await page.locator('input[name="rating"][value="4"]').check({ force: true });
  await page.getByRole('button', { name: 'Salveaza amintirea' }).click();
  await expect(page.getByText('Amintire salvata.')).toBeVisible();
  await expect(page.getByText('Adauga poze')).toBeVisible();
});

test('memory photo upload is private', async ({ page, playwright, baseURL }) => {
  test.skip(!process.env.E2E_BLOB_READ_WRITE_TOKEN, 'Necesita E2E_BLOB_READ_WRITE_TOKEN (scrie in Blob-ul real).');
  const id = await seedInvitation(testDb(), { startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) });
  await login(page, 'el');
  await page.goto(`/invitatii/${id}`);
  await page.getByLabel('Cum a fost?').fill('Cu poza');
  await page.locator('input[name="rating"][value="5"]').check({ force: true });
  await page.getByRole('button', { name: 'Salveaza amintirea' }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'poza.png', mimeType: 'image/png', buffer: TINY_PNG });
  const image = page.locator('.photo-grid img').first();
  await expect(image).toBeVisible();

  const src = await image.getAttribute('src');
  expect(src).toMatch(/^\/api\/photos\/[0-9a-f-]{36}$/);
  const anonymous = await playwright.request.newContext({ baseURL });
  expect((await anonymous.get(src!)).status()).toBe(401);
  await anonymous.dispose();
});

test('idea: add, see as the other user, turn into an invitation', async ({ page }) => {
  await login(page, 'ea');
  await page.goto('/idei');
  await page.getByLabel('Ce ai vrea sa facem?').fill('Patinaj E2E');
  await page.getByRole('button', { name: 'Adauga ideea' }).click();
  await expect(page.getByText('Idee adaugata.')).toBeVisible();
  await logout(page);

  await login(page, 'el');
  await page.goto('/idei');
  const card = page.locator('li', { hasText: 'Patinaj E2E' });
  await card.getByRole('link', { name: 'Fa din asta o invitatie' }).click();
  await expect(page.getByLabel('Titlu')).toHaveValue('Patinaj E2E');
});

test('calendar shows the current month and survives a bad parameter', async ({ page }) => {
  await login(page, 'el');
  await page.goto('/calendar?luna=<script>');
  await expect(page.locator('table.calendar')).toBeVisible();
  await page.getByRole('link', { name: /Luna viitoare/ }).click();
  await expect(page).toHaveURL(/luna=\d{4}-\d{2}/);
});
```

- [ ] **Step 2: Ruleaza**

Run: `npm run test:e2e -- flow.spec.ts`
Expected: build + start (1-3 min prima data), apoi toate testele PASS; testul de upload e **skipped** fara `E2E_BLOB_READ_WRITE_TOKEN`.

Daca un test pica, deschide raportul: `npx playwright show-trace test-results/<folder>/trace.zip`.

- [ ] **Step 3: Commit**

```bash
git add e2e/flow.spec.ts
git commit -m "test: add end-to-end flows for invitations, memories, ideas and calendar"
```

---

### Task 3: Teste de securitate (OWASP)

**Files:**
- Create: `e2e/security.spec.ts`

- [ ] **Step 1: Scrie `e2e/security.spec.ts`**

```ts
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { testDb } from '../test/db';
import { seedInvitation, seedMemory } from '../test/fixtures';
import { E2E_USERS } from './users';
import { login, useFreshIp, futureLocal, TINY_PNG } from './helpers';

test.describe('A01 access control', () => {
  test('pages redirect to login without a session', async ({ page }) => {
    for (const path of ['/', '/calendar', '/idei', '/notificari', '/invitatii/noua']) {
      await page.goto(path);
      await expect(page).toHaveURL('/login');
    }
  });

  test('api routes answer 401 without a session', async ({ playwright, baseURL }) => {
    const anonymous = await playwright.request.newContext({ baseURL });
    expect((await anonymous.get(`/api/photos/${randomUUID()}`)).status()).toBe(401);
    expect((await anonymous.post('/api/blob-upload', { multipart: { memoryId: randomUUID() } })).status()).toBe(401);
    await anonymous.dispose();
  });

  test('a forged session cookie is ignored', async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'session', value: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJlbCJ9.', url: baseURL! }]);
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('unknown or malformed invitation ids are 404', async ({ page }) => {
    await login(page, 'el');
    expect((await page.goto(`/invitatii/${randomUUID()}`))?.status()).toBe(404);
    expect((await page.goto('/invitatii/1%27%20OR%201=1'))?.status()).toBe(404);
  });

  test("the creator gets no answer form on their own invitation", async ({ page }) => {
    const id = await seedInvitation(testDb(), { status: 'pending', startsAt: new Date(Date.now() + 5 * 86_400_000) });
    await login(page, 'el');
    await page.goto(`/invitatii/${id}`);
    await expect(page.getByRole('button', { name: 'Anulez invitatia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trimite raspunsul' })).toHaveCount(0);
  });

  test("uploading to the other user's memory is rejected", async ({ page, baseURL }) => {
    const db = testDb();
    const memoryId = await seedMemory(db, await seedInvitation(db), 'ea');
    await login(page, 'el');
    const response = await page.request.post('/api/blob-upload', {
      headers: { origin: baseURL! },
      multipart: { memoryId, file: { name: 'p.png', mimeType: 'image/png', buffer: TINY_PNG } },
    });
    expect(response.status()).toBe(404);
  });
});

test.describe('A02 security headers', () => {
  test('responses carry CSP with nonce and hardening headers', async ({ page }) => {
    const response = await page.goto('/login');
    const headers = response!.headers();
    expect(headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).not.toContain('unsafe-eval');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('same-origin');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('no CSP violations on the main pages', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Content Security Policy')) violations.push(message.text());
    });
    await page.goto('/login');
    await login(page, 'ea');
    await page.goto('/calendar');
    await page.goto('/idei');
    expect(violations).toEqual([]);
  });
});

test.describe('A05 injection', () => {
  test('html in user content is rendered as text', async ({ page }) => {
    const payload = '<img src=x onerror="window.__xss=1">';
    await login(page, 'el');
    await page.goto('/invitatii/noua');
    await page.getByLabel('Titlu').fill(payload);
    await page.getByLabel('Mesaj').fill(payload);
    await page.getByLabel('Unde').fill('Acasa');
    await page.getByLabel('Cand').fill(futureLocal(3));
    await page.getByRole('button', { name: 'Trimite invitatia' }).click();
    await expect(page.getByRole('heading', { name: payload })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });
});

test.describe('A07 authentication', () => {
  test('rate limit blocks after 5 wrong passwords, even with the right one', async ({ page }) => {
    await useFreshIp(page);
    await page.goto('/login');
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Utilizator').fill(E2E_USERS.el.name);
      await page.getByLabel('Parola').fill(`gresit-${i}`);
      await page.getByRole('button', { name: 'Intra' }).click();
      await expect(page.getByRole('alert')).toContainText('Utilizator sau parola gresite');
    }
    await page.getByLabel('Utilizator').fill(E2E_USERS.el.name);
    await page.getByLabel('Parola').fill(E2E_USERS.el.password);
    await page.getByRole('button', { name: 'Intra' }).click();
    await expect(page.getByRole('alert')).toContainText('Prea multe incercari');
    await expect(page).toHaveURL('/login');
  });

  test('session cookie is httpOnly and SameSite=Lax', async ({ page, context }) => {
    await login(page, 'el');
    const cookie = (await context.cookies()).find((c) => c.name === 'session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.secure).toBe(true);
  });

  test('logout removes the session', async ({ page, context }) => {
    await login(page, 'el');
    await page.getByRole('button', { name: 'Iesi' }).click();
    await expect(page).toHaveURL('/login');
    expect((await context.cookies()).find((c) => c.name === 'session')).toBeUndefined();
  });
});

test.describe('A08 upload integrity', () => {
  async function ownMemory() {
    const db = testDb();
    return seedMemory(db, await seedInvitation(db), 'ea');
  }

  test('cross-origin uploads are rejected', async ({ page }) => {
    const memoryId = await ownMemory();
    await login(page, 'ea');
    const response = await page.request.post('/api/blob-upload', {
      headers: { origin: 'https://evil.example' },
      multipart: { memoryId, file: { name: 'p.png', mimeType: 'image/png', buffer: TINY_PNG } },
    });
    expect(response.status()).toBe(403);
  });

  test('non-images are rejected even with an image content type', async ({ page, baseURL }) => {
    const memoryId = await ownMemory();
    await login(page, 'ea');
    const response = await page.request.post('/api/blob-upload', {
      headers: { origin: baseURL! },
      multipart: {
        memoryId,
        file: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('<svg onload="alert(1)"></svg>') },
      },
    });
    expect(response.status()).toBe(400);
  });

  test('oversized uploads are rejected', async ({ page, baseURL }) => {
    const memoryId = await ownMemory();
    await login(page, 'ea');
    const big = Buffer.concat([TINY_PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const response = await page.request.post('/api/blob-upload', {
      headers: { origin: baseURL! },
      multipart: { memoryId, file: { name: 'big.png', mimeType: 'image/png', buffer: big } },
    });
    expect(response.status()).toBe(413);
  });
});
```

- [ ] **Step 2: Ruleaza**

Run: `npm run test:e2e -- security.spec.ts`
Expected: toate PASS.

Posibila ajustare: daca testul "no CSP violations" raporteaza o violare de la `style-src` pentru un worker sau un `blob:` al three.js, citeste mesajul exact si adauga doar sursa respectiva in `lib/security/csp.ts` (niciodata `'unsafe-eval'` sau `*` in productie), apoi reia testul si testul unit `lib/security/csp.test.ts`.

- [ ] **Step 3: Ruleaza toata suita**

Run: `npm run verify && npm run test:e2e`
Expected: tot PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e/security.spec.ts
git commit -m "test: add OWASP-focused end-to-end security tests"
```

---

### Task 4: Deploy config, Dependabot, checklist

**Files:**
- Create: `vercel.json`, `.github/dependabot.yml`, `docs/security-checklist.md`

- [ ] **Step 1: Scrie `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["fra1"]
}
```

- [ ] **Step 2: Scrie `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      minor-and-patch:
        update-types: [minor, patch]
```

- [ ] **Step 3: Scrie `docs/security-checklist.md`**

```markdown
# Checklist de securitate (inainte de fiecare deploy important)

## Automat
- [ ] `npm run verify` trece (typecheck, teste unit + integrare, `npm audit --audit-level=high`)
- [ ] `npm run test:e2e` trece (inclusiv `security.spec.ts`)

## Configurare
- [ ] In Vercel exista toate variabilele din `.env.local.example` pentru Production
- [ ] `SESSION_SECRET` din productie e diferit de cel local si are minim 32 de caractere
- [ ] Nu mai exista variabilele vechi `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_API_TOKEN`
- [ ] Tokenul vechi `VERCEL_API_TOKEN` e revocat (Vercel -> Account Settings -> Tokens)
- [ ] `.env.local` si `.env.test.local` NU apar in `git status` / pe GitHub
- [ ] Dependabot e activ (GitHub -> repo -> Settings -> Code security -> Dependabot alerts: Enabled)
- [ ] Functiile ruleaza in `fra1` (Vercel -> Project -> Settings -> Functions)

## Verificare pe productie
- [ ] Headere: https://securityheaders.com cu URL-ul aplicatiei -> nota A sau A+
- [ ] Fereastra privata -> `https://<app>/` -> redirect la `/login`
- [ ] Fereastra privata -> URL-ul unei poze (`/api/photos/...`, copiat dintr-o sesiune logata) -> 401
- [ ] 6 incercari gresite de login -> mesajul "Prea multe incercari"
- [ ] Vercel -> Logs: nu apar parole, token-uri sau continutul mesajelor
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json .github/dependabot.yml docs/security-checklist.md
git commit -m "chore: pin Vercel region, enable Dependabot, add security checklist"
```

---

### Task 5: Ghidul `SETUP.md`

**Files:**
- Create: `SETUP.md`

- [ ] **Step 1: Scrie `SETUP.md`**

````markdown
# Ghid de configurare, pas cu pas

Ghidul presupune ca pornesti de la zero. Fa pasii in ordine. Unde scrie "copiaza", pune valoarea intr-un fisier text temporar pana ajungi la pasul cu variabilele de mediu.

Timp estimat: 45-60 de minute prima data.

---

## 0. Ce iti trebuie

- **Node.js 22** (verifica in terminal: `node -v` trebuie sa arate `v22...`). Daca nu il ai: https://nodejs.org -> descarca versiunea LTS 22 -> instaleaza cu Next, Next, Finish.
- **Git** (verifica: `git --version`).
- Conturi (toate gratuite): **GitHub** (il ai deja), **Vercel** (il ai deja), **TiDB Cloud**, **Resend** (il ai deja).

Toate comenzile de mai jos se ruleaza in terminal, in folderul proiectului (`C:\Users\<tu>\Desktop\invitatie`).

---

## 1. Baza de date (TiDB Cloud)

### 1.1 Cont si cluster
1. Intra pe https://tidbcloud.com si fa-ti cont (poti folosi "Sign in with Google").
2. Daca te intreaba de un "organization" sau "project", lasa numele implicite.
3. Pe pagina **Clusters**, apasa **Create Cluster**.
4. Alege planul **Starter** (gratuit; in unele versiuni ale interfetei apare ca "Serverless").
5. **Cloud Provider**: AWS. **Region**: **Frankfurt (eu-central-1)**. Regiunea conteaza: Vercel ruleaza tot in Frankfurt, deci aplicatia e rapida.
6. **Cluster Name**: `dateuri`. Apasa **Create**. Asteapta ~1 minut pana statusul devine "Available".

### 1.2 Datele de conectare
1. Deschide clusterul `dateuri`. Sus-dreapta apasa **Connect**.
2. **Connection Type**: `Public`. **Connect With**: `General`.
3. Apasa **Generate Password**. **Copiaza parola acum**: nu o mai poti vedea dupa ce inchizi fereastra (poti genera alta oricand, dar cea veche nu mai merge).
4. Copiaza si:
   - **HOST** (arata ca `gateway01.eu-central-1.prod.aws.tidbcloud.com`)
   - **PORT** (`4000`)
   - **USERNAME** (arata ca `2abcDEFgh.root`)

### 1.3 Cele doua baze de date
1. In meniul din stanga al clusterului, deschide **SQL Editor**.
2. Scrie si ruleaza (butonul **Run**):
   ```sql
   CREATE DATABASE dates;
   CREATE DATABASE dates_test;
   ```
   `dates` e baza reala. `dates_test` e folosita doar de teste, ca ele sa nu atinga niciodata datele voastre.

### 1.4 Connection string-urile
Construieste doua randuri, inlocuind `USERNAME`, `PAROLA`, `HOST`:

```
mysql://USERNAME:PAROLA@HOST:4000/dates?ssl={"rejectUnauthorized":true}
mysql://USERNAME:PAROLA@HOST:4000/dates_test?ssl={"rejectUnauthorized":true}
```

Primul e `DATABASE_URL`, al doilea e `TEST_DATABASE_URL`.

> Daca parola contine vreunul dintre caracterele `@ : / ? # %`, genereaza alta parola (pasul 1.2). Parolele generate de TiDB sunt de obicei doar litere si cifre.

---

## 2. Emailuri (Resend)

1. Intra pe https://resend.com cu contul existent.
2. Meniul din stanga -> **API Keys** -> **Create API Key**.
3. **Name**: `dateuri`. **Permission**: `Sending access`. Apasa **Add**.
4. **Copiaza cheia** (incepe cu `re_`): se afiseaza o singura data. Asta e `RESEND_API_KEY`.
5. `EMAIL_EL` = adresa de email cu care e facut contul Resend (vezi Settings -> Team sau coltul din dreapta-sus).

> De ce doar la tine: fara un domeniu verificat, Resend trimite emailuri doar la adresa contului. Ea vede toate notificarile in aplicatie (badge-ul de la "Notificari"). Daca verifici mai tarziu un domeniu in Resend (Domains -> Add Domain), completeaza `EMAIL_EA` si cere o mica modificare in `lib/notifications/email.ts`.

---

## 3. Vercel: poze (Blob) si curatenie dupa aplicatia veche

### 3.1 Blob store pentru poze
1. Intra pe https://vercel.com -> deschide proiectul existent (`invitatie`).
2. Tab-ul **Storage** -> **Create Database** (sau **Create**) -> alege **Blob** -> **Continue**.
3. **Name**: `dateuri-poze`. Apasa **Create**.
4. Cand te intreaba de conectare la proiect, alege proiectul `invitatie` si bifeaza **toate mediile** (Production, Preview, Development) -> **Connect**.
5. Vercel adauga singur variabila `BLOB_READ_WRITE_TOKEN` in proiect.
6. Ca sa o ai si local: proiect -> **Settings** -> **Environment Variables** -> cauta `BLOB_READ_WRITE_TOKEN` -> iconita de ochi / **Reveal** -> copiaz-o.

### 3.2 Scoate ce nu mai folosim (important pentru securitate)
1. Proiect -> **Settings** -> **Environment Variables**: sterge `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_API_TOKEN` (meniul cu trei puncte -> **Remove**).
2. Tab-ul **Storage** -> store-ul Edge Config vechi -> **Projects** -> **Disconnect**. (Poti sterge store-ul din Settings-ul lui.)
3. Avatarul tau (sus-dreapta) -> **Account Settings** -> **Tokens** -> sterge tokenul folosit pentru tema veche. Un token lasat activ da acces la contul tau Vercel.

---

## 4. Configurarea locala

### 4.1 Instalare
```bash
npm install
```

### 4.2 Fisierul `.env.local`
```bash
cp .env.local.example .env.local
```
Deschide `.env.local` in editor si completeaza:

| Variabila | Ce pui |
|---|---|
| `DATABASE_URL` | primul connection string de la pasul 1.4 |
| `SESSION_SECRET` | rezultatul comenzii `npm run gen-secret` |
| `USER_EL_NAME` | username-ul tau de login (ex. `catalin`) |
| `USER_EL_PASSWORD_HASH` | rezultatul `npm run hash-password` (vezi mai jos) |
| `USER_EA_NAME` | username-ul ei (ex. un nume de alint) |
| `USER_EA_PASSWORD_HASH` | rezultatul `npm run hash-password` pentru parola ei |
| `EMAIL_EL` | de la pasul 2 |
| `EMAIL_EA` | lasa gol |
| `RESEND_API_KEY` | de la pasul 2 |
| `BLOB_READ_WRITE_TOKEN` | de la pasul 3.1 |
| `APP_URL` | lasa gol local |

Pentru fiecare parola, ruleaza comanda din **PowerShell** sau **cmd** (in Git Bash parola se vede pe ecran cand o tastezi; acolo foloseste `winpty npm run hash-password`):
```bash
npm run hash-password
```
Parola trebuie sa aiba minim 12 caractere (ideal 3-4 cuvinte, ex. `elefant roz danseaza tango`). Scrie parola, apoi repeta-o. Comanda afiseaza un rand lung (base64): copiaza-l **intreg** in variabila `..._PASSWORD_HASH`. Parola in clar nu se salveaza nicaieri.

Username-urile nu tin cont de litere mari / mici. Parolele da.

### 4.3 Fisierul `.env.test.local` (pentru teste)
```bash
cp .env.test.local.example .env.test.local
```
Pune in `TEST_DATABASE_URL` al doilea connection string de la pasul 1.4 (cel cu `dates_test`).

### 4.4 Tabelele
```bash
npm run db:migrate
```
Expected: mesaje de tip `migrations applied successfully`. Verifica in TiDB -> SQL Editor:
```sql
USE dates;
SHOW TABLES;
```
Trebuie sa vezi: `ideas`, `invitations`, `login_attempts`, `memories`, `notifications`, `photos` si `__drizzle_migrations`.

### 4.5 Porneste aplicatia
```bash
npm run dev
```
Deschide http://localhost:3000 si logheaza-te cu fiecare user.

### 4.6 Ruleaza testele
```bash
npm run verify
```
Toate testele trebuie sa treaca. Pentru testele in browser (optional, dureaza cateva minute):
```bash
npx playwright install chromium
npm run test:e2e
```
Testul de upload real de poze e sarit automat. Ca sa-l rulezi, adauga in `.env.test.local` si `E2E_BLOB_READ_WRITE_TOKEN=<acelasi token Blob>` (scrie poze mici de test in Blob-ul real).

---

## 5. Variabilele de mediu in Vercel

Proiect -> **Settings** -> **Environment Variables**. Pentru fiecare rand de mai jos: **Key** = numele, **Value** = valoarea, bifeaza **Production** (si **Preview** daca vrei ca si preview-urile din PR-uri sa mearga) -> **Save**.

| Key | Value |
|---|---|
| `DATABASE_URL` | la fel ca local (baza `dates`) |
| `SESSION_SECRET` | **unul nou**: ruleaza iar `npm run gen-secret` |
| `USER_EL_NAME`, `USER_EL_PASSWORD_HASH` | la fel ca local |
| `USER_EA_NAME`, `USER_EA_PASSWORD_HASH` | la fel ca local |
| `EMAIL_EL` | la fel ca local |
| `RESEND_API_KEY` | la fel ca local |
| `APP_URL` | optional, ex. `https://invitatie.vercel.app` (fara `/` la final) |

`BLOB_READ_WRITE_TOKEN` exista deja (pasul 3.1).

Regiunea functiilor e setata in cod (`vercel.json` -> `fra1`). Verifica dupa deploy: **Settings** -> **Functions** -> **Function Region** arata Frankfurt.

---

## 6. Deploy

1. Pe GitHub, deschide repo-ul -> apare banner-ul pentru branch-ul `date-manager` -> **Compare & pull request** -> **Create pull request**.
2. Vercel face automat un **Preview** pentru PR (link in comentariile PR-ului). Poti testa acolo daca ai bifat Preview la pasul 5.
3. **Merge pull request** -> Vercel face deploy pe productie din `master` (tab-ul **Deployments**, ~2 minute).

---

## 7. Verificare pe productie

1. Deschide URL-ul aplicatiei -> ajungi la login.
2. Logheaza-te ca el -> creeaza o invitatie pentru maine.
3. Intr-o fereastra privata, logheaza-te ca ea -> badge "1" la Notificari -> deschide invitatia -> animatia cu inima -> deruleaza -> raspunde "Propun alta ora".
4. Verifica emailul (`EMAIL_EL`): a venit notificarea (uita-te si in Spam).
5. Ca el -> "Accept ora propusa" -> dashboard arata countdown.
6. Parcurge si `docs/security-checklist.md`.

---

## 8. Operatiuni uzuale

- **Schimb o parola:** `npm run hash-password` -> inlocuieste `USER_.._PASSWORD_HASH` in `.env.local` si in Vercel -> in Vercel, **Deployments** -> ultimul deploy -> meniul cu trei puncte -> **Redeploy**.
- **Delogheaza pe toata lumea:** genereaza un `SESSION_SECRET` nou in Vercel -> Redeploy.
- **Te-ai blocat din greseala la login (5 incercari):** asteapta 15 minute, sau in TiDB SQL Editor: `USE dates; DELETE FROM login_attempts;`
- **Vezi erorile aplicatiei:** Vercel -> proiect -> **Logs** -> cauta `"level":"error"`.

---

## 9. Probleme frecvente

| Ce vezi | Cauza | Solutie |
|---|---|---|
| `Variabile de mediu lipsa sau invalide: SESSION_SECRET (...)` | variabila lipseste sau e prea scurta | `npm run gen-secret`, pune rezultatul |
| `USER_EL_PASSWORD_HASH (trebuie generat cu npm run hash-password)` | ai pus parola sau hash-ul brut `$2b$...` | ruleaza `npm run hash-password` si pune randul base64 |
| `USER_EA_NAME (trebuie sa difere de USER_EL_NAME)` | acelasi username pentru amandoi | alege altul |
| `Access denied for user` | user sau parola gresite in `DATABASE_URL` | refa pasul 1.2 si 1.4 |
| `Connections using insecure transport are prohibited` | lipseste `?ssl={"rejectUnauthorized":true}` din URL | adauga-l la final |
| `Unknown database 'dates'` | baza nu exista | pasul 1.3 |
| `TEST_DATABASE_URL trebuie sa pointeze la baza dates_test` | ai pus baza reala la teste | pune URL-ul cu `/dates_test` |
| Testele de integrare apar "skipped" | lipseste `.env.test.local` | pasul 4.3 |
| Login mereu "gresit" | username diferit de cel din env, sau blocat de rate limit | verifica `USER_.._NAME`; vezi "Te-ai blocat" mai sus |
| Nu vine emailul | `EMAIL_EL` diferit de adresa contului Resend, sau Spam | Resend -> **Emails** arata fiecare trimitere si motivul erorii |
| "Sunt acceptate doar poze JPEG, PNG sau WebP" | poza HEIC pe un browser desktop care nu o poate deschide | trimite-o de pe telefon sau converteste in JPG |
| Nu se vad frunzele / fulgii | WebGL dezactivat (accelerare hardware oprita in browser) | Chrome -> Settings -> System -> "Use graphics acceleration" pornit; aplicatia merge si fara |
| `npm audit` raporteaza vulnerabilitati | dependinte vechi | `npm audit fix` (fara `--force`), apoi `npm run verify` |
````

- [ ] **Step 2: Citeste-l o data cap-coada si verifica ca fiecare nume de script / fisier / variabila exista exact asa in proiect**

Run: `npm run` (listeaza scripturile) si compara cu `gen-secret`, `hash-password`, `db:migrate`, `verify`, `test:e2e` din ghid.

- [ ] **Step 3: Commit**

```bash
git add SETUP.md
git commit -m "docs: add step-by-step setup guide"
```

---

### Task 6: README si verificarea finala

**Files:**
- Modify: `README.md` (rescris)

- [ ] **Step 1: Rescrie `README.md`**

````markdown
# Dateurile noastre

Manager de dateuri pentru doi: invitatii cu raspuns (Da / Nu / Propun alta ora), dashboard cu countdown, calendar, amintiri cu rating si poze private, idei comune, notificari. Fundal 3D cu frunze si fulgi pastel.

**Configurare de la zero: vezi [SETUP.md](SETUP.md).**

## Stack

Next.js 16 (App Router, Server Actions) · TiDB Cloud (Drizzle, driver HTTP) · Resend · Vercel Blob · three.js / React Three Fiber · Vitest · Playwright

## Comenzi

```bash
npm run dev            # aplicatia local, http://localhost:3000
npm run verify         # typecheck + teste + npm audit
npm run test:e2e       # teste in browser (flux + securitate)
npm run db:generate    # genereaza o migrare dupa ce modifici lib/db/schema.ts
npm run db:migrate     # aplica migrarile pe baza din DATABASE_URL
npm run hash-password  # hash pentru o parola noua
npm run gen-secret     # SESSION_SECRET nou
```

## Structura

- `app/`: pagini si Server Actions (subtiri: validare + apel de serviciu)
- `lib/`: logica. Serviciile primesc `db` si `now`, deci sunt testate pe o baza TiDB separata (`dates_test`)
- `lib/invitations/state-machine.ts`: singura sursa de adevar pentru ce se poate face cu o invitatie
- `components/scene/` + `lib/scene/`: scena 3D (matematica in functii pure, testate)
- `proxy.ts`: CSP cu nonce si blocarea rutelor fara sesiune

## Securitate

Doi useri fixi din env (parole bcrypt), sesiune JWT in cookie `httpOnly`, rate limit la login, CSP strict, poze servite doar prin server dupa verificarea sesiunii. Detalii si verificari: `docs/security-checklist.md`.
````

- [ ] **Step 2: Verificarea finala completa**

Run: `npm run verify`
Expected: typecheck OK, toate testele unit + integrare PASS, audit fara high / critical.

Run: `npm run test:e2e`
Expected: toate PASS (upload skipped fara `E2E_BLOB_READ_WRITE_TOKEN`).

Run: `npm run build`
Expected: build reusit.

Run: `git status`
Expected: curat; `.env.local` / `.env.test.local` nu apar.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for the date manager"
```

- [ ] **Step 4: Finalizarea branch-ului**

Foloseste skill-ul `superpowers:finishing-a-development-branch`. **Nu face push si nu deschide PR fara confirmarea userului** in chat.
