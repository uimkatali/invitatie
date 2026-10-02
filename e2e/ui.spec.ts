import { test, expect, type Page } from '@playwright/test';
import { testDb } from '../test/db';
import { seedInvitation, seedMemory } from '../test/fixtures';
import { notifications, photos } from '@/lib/db/schema';
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

async function transformOf(page: Page): Promise<{ scale: number; x: number; y: number }> {
  const style = (await page.locator('.lightbox-img').getAttribute('style')) ?? '';
  const scale = Number(/scale\(([\d.]+)\)/.exec(style)?.[1] ?? 1);
  const translate = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec(style);
  return { scale, x: Number(translate?.[1] ?? 0), y: Number(translate?.[2] ?? 0) };
}

const scaleOf = async (page: Page) => (await transformOf(page)).scale;

test.describe('photo lightbox', () => {
  test('opens on click, takes focus, and closes with Escape, the X button and a tap on the empty area', async ({ page }) => {
    await openPageWithPhoto(page);
    const dialog = page.getByRole('dialog', { name: 'Poza marita' });
    const thumb = page.getByRole('button', { name: 'Mareste poza 1 din 1' });

    await expect(dialog).toBeHidden();
    await thumb.click();
    await expect(dialog).toBeVisible();
    await expect(page.locator('.lightbox-img')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inchide poza' })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    // un singur clic pe poza nu o inchide
    await page.locator('.lightbox-img').click();
    await page.waitForTimeout(500);
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(thumb).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');

    await thumb.click();
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Inchide poza' }).click();
    await expect(dialog).toBeHidden();
    await expect(thumb).toBeFocused();

    await thumb.click();
    await expect(dialog).toBeVisible();
    await page.locator('.lightbox-stage').click({ position: { x: 5, y: 300 } });
    await expect(dialog).toBeHidden();
  });

  test('double click zooms in and back out, the wheel zooms, the keyboard zooms and pans', async ({ page }) => {
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

    await page.keyboard.press('0');
    await expect.poll(() => scaleOf(page)).toBe(1);
    await page.keyboard.press('+');
    await expect.poll(() => scaleOf(page)).toBe(1.25);
    // La 1.25 poza inca incape in scena (pan corect 0); marim pana depaseste latimea scenei.
    for (let i = 0; i < 3; i++) await page.keyboard.press('+');
    await expect.poll(() => scaleOf(page)).toBeCloseTo(2.4414, 3);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await transformOf(page)).x).toBeGreaterThan(0);
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

  test.describe('on a portrait phone', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('a landscape photo cannot be dragged off screen vertically', async ({ page }) => {
      await openPageWithPhoto(page);
      await page.getByRole('button', { name: 'Mareste poza' }).click();
      const img = page.locator('.lightbox-img');
      await expect(img).toBeVisible();
      await img.dblclick();
      await expect.poll(() => scaleOf(page)).toBe(2.5);

      // poza 4:3 e ~292px inalta in 844: la 2.5x tot incape pe verticala, deci nu are voie sa se mute in sus/jos
      await page.mouse.move(195, 420);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(195, 420 + i * 100);
      await page.mouse.up();
      expect((await transformOf(page)).y).toBe(0);
      const box = (await img.boundingBox())!;
      expect(box.y + box.height).toBeGreaterThan(0);
      expect(box.y).toBeLessThan(844);
    });

    test('touch: tap on the empty area closes, two fingers pinch to zoom', async ({ page }) => {
      await openPageWithPhoto(page);
      const dialog = page.getByRole('dialog', { name: 'Poza marita' });
      await page.getByRole('button', { name: 'Mareste poza' }).tap();
      await expect(dialog).toBeVisible();

      // pinch real, prin evenimente tactile CDP (genereaza pointerType: 'touch' cu doua degete)
      const cdp = await page.context().newCDPSession(page);
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number; id: number }[]) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      await touch('touchStart', [
        { x: 160, y: 420, id: 1 },
        { x: 230, y: 420, id: 2 },
      ]);
      for (let i = 1; i <= 8; i++) {
        await touch('touchMove', [
          { x: 160 - i * 8, y: 420, id: 1 },
          { x: 230 + i * 8, y: 420, id: 2 },
        ]);
      }
      await touch('touchEnd', []);
      await expect.poll(() => scaleOf(page)).toBeGreaterThan(1.8);

      // revenim la 1x cu dublu-tap, apoi un tap pe zona goala inchide
      await page.keyboard.press('0');
      await expect.poll(() => scaleOf(page)).toBe(1);
      await page.touchscreen.tap(195, 40);
      await expect(dialog).toBeHidden();
    });
  });
});

test.describe('mobile menu', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hamburger opens the links, tap targets are big, a link closes the menu', async ({ page }) => {
    await login(page, 'el');
    const toggle = page.getByRole('button', { name: 'Meniu' });
    const calendar = page.locator('#main-nav').getByRole('link', { name: 'Calendar', exact: true });

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(calendar).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(calendar).toBeVisible();
    const box = await calendar.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await calendar.click();
    await expect(page).toHaveURL(/\/calendar/);
    await expect(calendar).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('menu items never overlap each other and the current page is marked', async ({ page }) => {
    await login(page, 'el');
    await page.getByRole('button', { name: 'Meniu' }).click();
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
    await expect(page.locator('#main-nav').getByRole('link', { name: 'Acasa', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('Escape returns focus to the button, a tap outside closes the menu', async ({ page }) => {
    await login(page, 'el');
    const toggle = page.getByRole('button', { name: 'Meniu' });
    const calendar = page.locator('#main-nav').getByRole('link', { name: 'Calendar', exact: true });

    await toggle.click();
    await expect(calendar).toBeVisible();
    await calendar.focus();
    await page.keyboard.press('Escape');
    await expect(calendar).toBeHidden();
    await expect(toggle).toBeFocused();

    await toggle.click();
    await expect(calendar).toBeVisible();
    await page.mouse.click(5, 780);
    await expect(calendar).toBeHidden();
  });

  test('the logo closes the menu even when already on the home page', async ({ page }) => {
    await login(page, 'el');
    const toggle = page.getByRole('button', { name: 'Meniu' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.app-header .logo').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('unread notifications stay visible on the closed menu button', async ({ page }) => {
    await testDb().insert(notifications).values({
      id: newId(),
      recipient: 'el',
      type: 'idea_added',
      invitationId: null,
      invitationStatus: null,
      readAt: null,
      createdAt: new Date(),
    });
    await login(page, 'el');
    await expect(page.locator('.menu-toggle .menu-badge')).toBeVisible();
    await expect(page.getByRole('button', { name: /Meniu, \d+ notificari necitite/ })).toBeVisible();
  });
});

test.describe('header at narrow and tablet widths', () => {
  for (const width of [320, 700, 880]) {
    test(`logo and menu button never overlap at ${width}px and nothing overflows`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await login(page, 'el');
      const layout = await page.evaluate(() => {
        const header = document.querySelector('.app-header') as HTMLElement;
        const logo = document.querySelector('.app-header .logo')!.getBoundingClientRect();
        const toggle = document.querySelector('.menu-toggle')!.getBoundingClientRect();
        return {
          overflow: header.scrollWidth - header.clientWidth,
          logoRight: logo.right,
          toggleLeft: toggle.left,
          toggleVisible: toggle.width > 0,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(layout.toggleVisible).toBe(true);
      expect(layout.overflow).toBeLessThanOrEqual(0);
      expect(layout.pageOverflow).toBeLessThanOrEqual(0);
      expect(layout.logoRight).toBeLessThanOrEqual(layout.toggleLeft);
    });
  }
});

test('desktop keeps the horizontal navigation and marks the current page', async ({ page }) => {
  await login(page, 'el');
  const nav = page.locator('.main-nav');
  await expect(page.locator('.menu-toggle')).toBeHidden();
  await expect(nav.getByRole('link', { name: 'Calendar', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Acasa', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Calendar', exact: true })).not.toHaveAttribute('aria-current', 'page');
});
