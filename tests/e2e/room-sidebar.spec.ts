import { expect, test } from '@playwright/test';

test('room actions remain accessible without changing the row height', async ({ page }) => {
  await page.goto('/rooms/');
  const link = page.locator('a[href*="/rooms/!"], a[href*="/rooms/%21"]').first();
  await expect(link).toBeVisible();
  const row = link.locator('..');
  const initialBounds = await row.boundingBox();
  expect(initialBounds).not.toBeNull();

  await link.hover();
  const options = row.getByRole('button', { name: 'More Options', exact: true });
  await expect(options).toBeVisible();
  expect((await row.boundingBox())?.height).toBe(initialBounds?.height);

  await page.mouse.move(0, 0);
  await link.focus();
  await page.keyboard.press('Tab');
  await expect(options).toBeFocused();
  expect((await row.boundingBox())?.height).toBe(initialBounds?.height);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Room Settings', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(options).toBeFocused();
});

test('collapsing a room category keeps the selected room reachable', async ({ page }) => {
  await page.goto('/rooms/');
  const link = page.locator('a[href*="/rooms/!"], a[href*="/rooms/%21"]').first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  await link.click();
  const selectedLink = page.locator(`a[href=${JSON.stringify(href)}]`);
  await expect(selectedLink.locator('..')).toHaveAttribute('aria-selected', 'true');

  const category = page.getByRole('button', { name: 'Rooms', exact: true });
  await expect(category).toHaveAttribute('aria-expanded', 'true');
  try {
    await category.focus();
    await page.keyboard.press('Enter');
    await expect(category).toHaveAttribute('aria-expanded', 'false');
    await expect(selectedLink).toBeVisible();
  } finally {
    if ((await category.getAttribute('aria-expanded')) === 'false') await category.click();
  }
  await expect(category).toHaveAttribute('aria-expanded', 'true');
  await expect(selectedLink).toBeVisible();
});
