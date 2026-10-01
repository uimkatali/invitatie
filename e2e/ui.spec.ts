import { test, expect, type Page } from '@playwright/test';
import { testDb } from '../test/db';
import { seedInvitation, seedMemory } from '../test/fixtures';
import { photos } from '@/lib/db/schema';
import { newId } from '@/lib/ids';
import { login } from './helpers';

// Poza falsa servita in browser: in E2E nu exista un store Blob real, deci raspundem noi la cererea de imagine.
const FAKE_PHOTO = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#ffafcc"/></svg>',
);

async function openPageWithPhoto(page: Page): Promise<void> {
  const db = testDb();
  const invitationId = await seedInvitation(db, { title: 'Date cu poza' });
  const memoryId = await seedMemory(db, invitationId, 'ea');
  await db.insert(photos).values({
    id: newId(),
    memoryId,
    blobUrl: 'https://example.invalid/photo',
    blobPathname: `photos/${memoryId}/demo.svg`,
    contentType: 'image/svg+xml',
    width: 800,
    height: 600,
    createdAt: new Date(),
  });
  await page.route('**/api/photos/*', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: FAKE_PHOTO }),
  );
  await login(page, 'ea');
  await page.goto(`/invitatii/${invitationId}`);
}

async function scaleOf(page: Page): Promise<number> {
  const style = (await page.locator('.lightbox-img').getAttribute('style')) ?? '';
  return Number(/scale\(([\d.]+)\)/.exec(style)?.[1] ?? 1);
}

test.describe('photo lightbox', () => {
  test('opens on click and closes with Escape, the X button and a tap on the empty area', async ({ page }) => {
    await openPageWithPhoto(page);
    const dialog = page.getByRole('dialog', { name: 'Poza marita' });
    const thumb = page.getByRole('button', { name: 'Mareste poza' });

    await expect(dialog).toBeHidden();
    await thumb.click();
    await expect(dialog).toBeVisible();
    await expect(page.locator('.lightbox-img')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await thumb.click();
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Inchide poza' }).click();
    await expect(dialog).toBeHidden();

    await thumb.click();
    await expect(dialog).toBeVisible();
    await page.locator('.lightbox-stage').click({ position: { x: 5, y: 300 } });
    await expect(dialog).toBeHidden();
  });

  test('double click zooms in and back out, the wheel zooms', async ({ page }) => {
    await openPageWithPhoto(page);
    await page.getByRole('button', { name: 'Mareste poza' }).click();
    const img = page.locator('.lightbox-img');
    await expect(img).toBeVisible();
    expect(await scaleOf(page)).toBe(1);

    await img.dblclick();
    await expect.poll(() => scaleOf(page)).toBe(2.5);
    await img.dblclick();
    await expect.poll(() => scaleOf(page)).toBe(1);

    await img.hover();
    await page.mouse.wheel(0, -400);
    await expect.poll(() => scaleOf(page)).toBeGreaterThan(1.3);
  });

  test('the photo stays a plain image so the browser can save it', async ({ page }) => {
    await openPageWithPhoto(page);
    await page.getByRole('button', { name: 'Mareste poza' }).click();
    const img = page.locator('.lightbox-img');
    await expect(img).toBeVisible();
    // Salvarea se face din meniul contextual / apasare lunga: nu trebuie sa il blocheze nimic.
    const blocked = await page.evaluate(() => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.querySelector('.lightbox-img')!.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(blocked).toBe(false);
    await expect(img).toHaveAttribute('src', /^\/api\/photos\/[0-9a-f-]{36}$/);
  });
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hamburger opens the links, tap targets are big, a link closes the menu', async ({ page }) => {
    await login(page, 'el');
    const toggle = page.getByRole('button', { name: 'Deschide meniul' });
    const calendar = page.getByRole('link', { name: 'Calendar' });

    await expect(toggle).toBeVisible();
    await expect(calendar).toBeHidden();

    await toggle.click();
    await expect(page.getByRole('button', { name: 'Inchide meniul' })).toHaveAttribute('aria-expanded', 'true');
    await expect(calendar).toBeVisible();
    const box = await calendar.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await calendar.click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(calendar).toBeHidden();
    await expect(page.getByRole('button', { name: 'Deschide meniul' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('menu items never overlap each other', async ({ page }) => {
    await login(page, 'el');
    await page.getByRole('button', { name: 'Deschide meniul' }).click();
    const items = page.locator('.main-nav .nav-link');
    await expect(items.first()).toBeVisible();
    const boxes = await items.evaluateAll((nodes) =>
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      }),
    );
    expect(boxes.length).toBe(6); // 5 linkuri + Iesi
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 0.5);
    }
    for (const b of boxes) expect(b.right).toBeLessThanOrEqual(375);
  });

  test('Escape and a tap outside close the menu', async ({ page }) => {
    await login(page, 'el');
    const calendar = page.getByRole('link', { name: 'Calendar' });

    await page.getByRole('button', { name: 'Deschide meniul' }).click();
    await expect(calendar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(calendar).toBeHidden();

    await page.getByRole('button', { name: 'Deschide meniul' }).click();
    await expect(calendar).toBeVisible();
    await page.mouse.click(5, 780);
    await expect(calendar).toBeHidden();
  });
});

test('desktop keeps the horizontal navigation and marks the current page', async ({ page }) => {
  await login(page, 'el');
  const nav = page.locator('.main-nav');
  await expect(page.locator('.menu-toggle')).toBeHidden();
  await expect(nav.getByRole('link', { name: 'Calendar', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Acasa', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Calendar', exact: true })).not.toHaveAttribute('aria-current', 'page');
});
