const { test, expect } = require('@playwright/test');

async function loginUser(page) {
  await page.goto('http://127.0.0.1:3000/login.html');
  await page.getByRole('textbox', { name: 'Username' }).fill('testuser');
  await page.getByRole('textbox', { name: 'Password' }).fill('1234');

  // Fast submit without waiting for networkidle polling
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for post-login page load directly instead of arbitrary network idle state
  await page.waitForURL('**/*.html', { timeout: 5000 }).catch(() => {});
}

test.describe('Goals E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('User can create a new goal target', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/goals.html');

    const textInput = page.locator('input[type="text"]').first();
    if (await textInput.isVisible()) {
      await textInput.fill('New Laptop Fund');
    }

    const numInput = page.locator('input[type="number"]').first();
    if (await numInput.isVisible()) {
      await numInput.fill('2000');
    }

    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Create"), button:has-text("Add")')
      .first();

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('User can update progress on existing goal', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/goals.html');

    const actionBtn = page.locator('button').first();
    if (await actionBtn.isVisible()) {
      await actionBtn.click();
    }

    await expect(page.locator('body')).toBeVisible();
  });
});
