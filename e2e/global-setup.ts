import { chromium, type FullConfig } from '@playwright/test';
import applyMigrations from '../test/global-setup';
import { testDb, resetDb } from '../test/db';
import { E2E_USERS } from './users';

/**
 * Primul login dupa un build proaspat poate dura zeci de secunde (module incarcate la prima cerere), mai mult decat
 * timeout-ul unui expect din primul test. Il facem aici, o singura data, cu un timeout generos. Best-effort: daca
 * esueaza, testele isi raporteaza singure problema reala.
 */
async function warmUpServer(baseURL: string): Promise<void> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      baseURL,
      reducedMotion: 'reduce',
      extraHTTPHeaders: { 'x-forwarded-for': '10.251.251.251' },
    });
    const page = await context.newPage();
    await page.goto('/login');
    await page.getByLabel('Utilizator').fill(E2E_USERS.el.name);
    await page.getByLabel('Parola').fill(E2E_USERS.el.password);
    await page.getByRole('button', { name: 'Intra' }).click();
    await page.waitForURL(`${baseURL}/`, { timeout: 120_000 });
    for (const path of ['/calendar', '/idei', '/invitatii/noua', '/notificari']) {
      await page.goto(path, { timeout: 60_000 });
    }
    await context.close();
  } catch (error) {
    console.warn('E2E warm-up esuat (testele ruleaza oricum):', error instanceof Error ? error.message : error);
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig) {
  // applyMigrations refuza sa ruleze (arunca) daca TEST_DATABASE_URL nu se termina in /dates_test,
  // deci resetDb de mai jos nu ajunge niciodata pe baza reala.
  await applyMigrations();
  await resetDb(testDb());
  await warmUpServer(config.projects[0].use.baseURL ?? 'http://localhost:3100');
}
