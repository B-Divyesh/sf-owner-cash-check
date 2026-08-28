import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase('owner-cash-check'); request.onsuccess = () => resolve(); request.onerror = () => resolve(); });
  });
  await page.reload();
});

test('builds, edits, checks, and persists a cash plan', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Know what’s committed/);
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

test('keeps the saved forecast available offline', async ({ page, context }) => {
  await page.getByLabel('Balance today').fill('8000');
  await page.getByLabel('Keep-back reserve').fill('2000');
  await page.getByRole('button', { name: /Draw my/ }).click();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your 13-week cash plan' })).toBeVisible();
  await expect(page.getByText(/Offline — your plan remains editable/)).toBeVisible();
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
