import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase('owner-cash-check'); request.onsuccess = () => resolve(); request.onerror = () => resolve(); });
  });
  await page.reload();
});

test('builds, edits, checks, and persists a cash plan', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/See your next 13 weeks of cash/);
  await page.getByLabel('Balance today').fill('15000');
  await page.getByLabel('Keep-back reserve').fill('5000');
  await page.getByRole('button', { name: /Draw my 13-week view/ }).click();
  await expect(page.getByText('$10,000.00').first()).toBeVisible();

  await page.getByRole('button', { name: /Add cash item/ }).first().click();
  await page.getByLabel('Name').fill('Workshop rent');
  await page.getByLabel('Amount').fill('4200');
  await page.getByRole('button', { name: 'Add to plan' }).click();
  await expect(page.getByText('Workshop rent').first()).toBeVisible();
  await expect(page.getByText('$5,800.00').first()).toBeVisible();

  await page.getByRole('button', { name: /Weekly check-in/ }).first().click();
  await page.getByLabel('Actual balance today').fill('14750');
  await page.getByLabel('What changed?').fill('Rent still pending.');
  await page.getByRole('button', { name: 'Complete check-in' }).click();
  await expect(page.getByRole('heading', { name: 'Weekly check-ins' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Workshop rent').first()).toBeVisible();
  await expect(page.getByText(/Actual \$14,750.00/)).toBeVisible();
});

test('@claim:demo-sandbox keeps the real and sample plans isolated', async ({ page }) => {
  await page.getByLabel('Balance today').fill('15000');
  await page.getByLabel('Keep-back reserve').fill('5000');
  await page.getByRole('button', { name: /Draw my/ }).click();
  await expect(page.getByText('$15,000.00').first()).toBeVisible();

  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved.')).toBeVisible();
  await expect(page.getByText('Workshop rent').first()).toBeVisible();
  await expect(page.getByText('$18,400.00').first()).toBeVisible();
  await expect(page.getByText('$15,000.00').first()).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Workshop rent').first()).toBeVisible();
});

test('@claim:forecast-13-weeks renders the full sample cash plan', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Your 13-week cash plan' })).toBeVisible();
  await expect(page.locator('[data-week]')).toHaveCount(13);
  await expect(page.getByText('Cedar Street invoice').first()).toBeVisible();
  await expect(page.getByText('Quarterly tax set-aside').first()).toBeVisible();
});

test('@claim:backup-export downloads usable JSON, CSV, and encrypted backups from the sample plan', async ({ page }, testInfo) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Data, backup, and license settings' }).click();

  const jsonDownload = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON' }).click()]).then(([download]) => download);
  const jsonPath = testInfo.outputPath('sample.json');
  await jsonDownload.saveAs(jsonPath);
  expect(JSON.parse(await readFile(jsonPath, 'utf8')).entries).toHaveLength(4);

  const csvDownload = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]).then(([download]) => download);
  const csvPath = testInfo.outputPath('sample.csv');
  await csvDownload.saveAs(csvPath);
  const csv = await readFile(csvPath, 'utf8');
  expect(csv).toContain('"type","name","amount","date","confidence","completed","note"');
  expect(csv).toContain('Workshop rent');

  await page.getByRole('button', { name: 'Encrypted backup' }).click();
  await page.locator('#encrypt-form').getByLabel('Backup password').fill('sample-password');
  const encryptedDownload = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Encrypt & download' }).click()]).then(([download]) => download);
  const encryptedPath = testInfo.outputPath('sample.encrypted.json');
  await encryptedDownload.saveAs(encryptedPath);
  expect(JSON.parse(await readFile(encryptedPath, 'utf8')).format).toBe('owner-cash-check-encrypted-v1');
});

test('@claim:local-only keeps sample financial activity on this origin', async ({ page }) => {
  await page.goto('/demo');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.getByRole('button', { name: /Add cash item/ }).first().click();
  await page.getByLabel('Name').fill('Sample materials');
  await page.getByLabel('Amount').fill('125');
  await page.getByRole('button', { name: 'Add to plan' }).click();
  await expect(page.getByText('Sample materials').first()).toBeVisible();
  expect(requests.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
});

test('rejects blank required setup money instead of creating a zero plan', async ({ page }) => {
  await page.getByRole('button', { name: /Draw my/ }).click();
  await expect(page.getByText('Enter both a current balance and a reserve of zero or more.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /See your next 13 weeks/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your 13-week cash plan' })).toHaveCount(0);
});

test('returns keyboard focus to the invoking control after Escape closes a dialog', async ({ page }) => {
  await page.getByLabel('Balance today').fill('10000');
  await page.getByLabel('Keep-back reserve').fill('2500');
  await page.getByRole('button', { name: /Draw my/ }).click();
  const addItem = page.getByRole('button', { name: /Add cash item/ }).first();
  await addItem.focus();
  await addItem.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(addItem).toBeFocused();
});

test('has no serious accessibility violations on welcome, dashboard, or dialog', async ({ page }) => {
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.getByLabel('Balance today').fill('10000');
  await page.getByLabel('Keep-back reserve').fill('2500');
  await page.getByRole('button', { name: /Draw my/ }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: /Add cash item/ }).first().click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
});

test('@claim:offline-reload keeps the sample forecast available offline', async ({ page, context }) => {
  await page.goto('/demo');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your 13-week cash plan' })).toBeVisible();
  await expect(page.getByText(/Offline — your plan remains editable/)).toBeVisible();
});

test('shows the update control when an actual newer service worker waits', async ({ page }) => {
  await page.goto('/demo');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const swPath = 'dist/sw.js';
  const current = await readFile(swPath, 'utf8');
  await writeFile(swPath, current.replace(/const VERSION='[^']+'/, "const VERSION='occ-regression-update'"));
  try {
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((registration) => registration?.update()));
    await expect(page.getByText('An app update is ready.')).toBeVisible();
  } finally {
    await writeFile(swPath, current);
  }
});

test('serves privacy and terms as direct static routes', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page).toHaveTitle('Privacy — Owner Cash Check');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await page.goto('/terms/');
  await expect(page).toHaveTitle('Terms — Owner Cash Check');
  await expect(page.locator('h1')).toHaveText('Terms of use');
});

test('has product metadata, a designed not-found page, and a mobile-safe dashboard', async ({ page }) => {
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://owner-cash-check.sociobot.in/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /owner-cash-check-social/);
  await page.goto('/404/');
  await expect(page).toHaveTitle('Page not found — Owner Cash Check');
  await expect(page.getByRole('heading', { name: 'This cash sheet is not here.' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
