import { test, expect } from '@playwright/test';

test('redirects unauthenticated user', async ({ page }) => {
  await page.goto('http://localhost:3000/dashboard');
  await expect(page).toHaveURL(/login/);
});