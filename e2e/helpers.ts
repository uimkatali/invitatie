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
