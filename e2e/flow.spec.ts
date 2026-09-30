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
  await page.getByLabel('Iarna baby blue').check();
  await page.getByRole('button', { name: 'Trimite invitatia' }).click();
  await expect(page.getByRole('heading', { name: 'Cina E2E' })).toBeVisible();
  const invitationUrl = page.url();
  await logout(page);

  await login(page, 'ea');
  await expect(page.getByText('1 necitite')).toBeAttached();
  await page.goto(invitationUrl);
  // Titlul din experienta apare dupa hidratare (pana la ~3s, sau imediat fara WebGL / cu reduced motion).
  await expect(page.locator('.exp-reveal')).toHaveClass(/is-visible/, { timeout: 10_000 });
  await expect(page.locator('.exp-title')).toHaveText('Cina E2E');
  await page.locator('form.response-panel').scrollIntoViewIfNeeded();
  await page.getByLabel('Propun alta ora').check();
  await page.getByLabel('Ce ora ti-ar conveni?').fill(futureLocal(6));
  await page.getByRole('button', { name: 'Trimite raspunsul' }).click();
  await expect(page).toHaveURL(/\?mesaj=raspuns$/);
  await expect(page.getByRole('status')).toHaveText('Raspuns trimis.');
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
  test.skip(!process.env.E2E_BLOB_READ_WRITE_TOKEN, 'Necesita E2E_BLOB_READ_WRITE_TOKEN (tokenul unui store Blob PRIVAT real; scrie si sterge poze de test acolo).');
  const id = await seedInvitation(testDb(), { startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) });
  await login(page, 'el');
  await page.goto(`/invitatii/${id}`);
  await page.getByLabel('Cum a fost?').fill('Cu poza');
  await page.locator('input[name="rating"][value="5"]').check({ force: true });
  await page.getByRole('button', { name: 'Salveaza amintirea' }).click();
  // Inputul de fisiere apare abia dupa ce amintirea e salvata.
  await expect(page.getByText('Amintire salvata.')).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: 'poza.png', mimeType: 'image/png', buffer: TINY_PNG });
  const image = page.locator('.photo-grid img').first();
  await expect(image).toBeVisible({ timeout: 20_000 });

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
