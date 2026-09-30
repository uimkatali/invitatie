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

  test('the creator gets no answer form on their own invitation', async ({ page }) => {
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

  test.describe('with the full 3D scene', () => {
    // Scena completa (bloom, particule) e cea care poate incalca CSP-ul (blob:, worker-e, stiluri inline).
    test.use({ reducedMotion: 'no-preference' });

    test('no CSP violations on the main pages', async ({ page }) => {
      test.setTimeout(120_000);
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
    // 6 login-uri la rand, fiecare cu bcrypt + mai multe apeluri catre baza de test de la distanta.
    test.setTimeout(120_000);
    // Next monteaza si el un element role="alert" (route announcer), deci filtram dupa text.
    const alert = (text: string) => page.getByRole('alert').filter({ hasText: text });
    // Fiecare incercare asteapta raspunsul Server Action-ului si revenirea butonului; altfel formularul
    // (resetat de React dupa actiune) ar putea fi golit intre completare si click, iar incercarea nu s-ar mai trimite.
    const attempt = async (password: string) => {
      await page.getByLabel('Utilizator').fill(E2E_USERS.el.name);
      await page.getByLabel('Parola').fill(password);
      await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && 'next-action' in r.request().headers()),
        page.getByRole('button', { name: 'Intra' }).click(),
      ]);
      await expect(page.getByRole('button', { name: 'Intra' })).toBeEnabled();
    };
    await useFreshIp(page);
    await page.goto('/login');
    for (let i = 0; i < 5; i++) {
      await attempt(`gresit-${i}`);
      await expect(alert('Utilizator sau parola gresite')).toBeVisible();
    }
    await attempt(E2E_USERS.el.password);
    await expect(alert('Prea multe incercari')).toBeVisible();
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
