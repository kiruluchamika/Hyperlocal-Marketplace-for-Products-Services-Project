import { test, expect } from '@playwright/test';

test('admin login page opens', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/login');
  await expect(page).toHaveURL(/admin\/login/);
});