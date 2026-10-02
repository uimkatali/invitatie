import { test, expect } from '@playwright/test';
import { login } from './helpers';

// TEMPORAR (Plan A, spike): verifica pagina /test-stickere in Chrome; se sterge odata cu pagina (Plan C).

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('the sticker probe logs a pasted image, the WebP check and copies the report', async ({ page }) => {
  await login(page, 'el');
  await page.goto('/test-stickere');
  await expect(page.getByRole('heading', { name: 'Test stickere' })).toBeVisible();

  // Pune in clipboard un PNG 8x8 semi-transparent, apoi Ctrl+V in casuta: exact ce face un utilizator pe PC.
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255, 105, 180, 0.6)';
    ctx.fillRect(2, 2, 4, 4);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
  await page.getByRole('textbox', { name: /Casuta de test/ }).click();
  await page.keyboard.press('Control+V');

  const reportBox = page.getByRole('textbox', { name: 'Raport' });
  await expect(reportBox).toHaveValue(/userAgent: .*Chrome/);
  await expect(reportBox).toHaveValue(/paste: .*file:image\/png/);
  await expect(reportBox).toHaveValue(/beforeinput: insertFromPaste/);
  await expect(reportBox).toHaveValue(/imagine noua in camp: img data: 8x8/);

  await page.getByRole('button', { name: 'Test WebP' }).click();
  await expect(reportBox).toHaveValue(/webp: toBlob\('image\/webp'\) a intors image\/webp/);

  await page.getByRole('button', { name: 'Copiaza raportul' }).click();
  await expect(page.getByRole('button', { name: 'Copiat!' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('webp:');

  console.log(`--- raport Chrome ---\n${await reportBox.inputValue()}`);
});
