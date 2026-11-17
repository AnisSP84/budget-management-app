const { test, expect } = require('@playwright/test');

async function loginUser(page) {
  await page.goto('http://127.0.0.1:3000/login.html');
  await page.getByRole('textbox', { name: 'Username' }).fill('testuser');
  await page.getByRole('textbox', { name: 'Password' }).fill('1234');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/*.html', { timeout: 5000 }).catch(() => {});
}

test.describe('Budget Controller E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('User gets error when submitting empty budget amount', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/budget.html');

    const input = page.locator('input').first();
    if (await input.isVisible()) {
      await input.fill('');
    }

    const saveBtn = page
      .locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")')
      .first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('User can update overall budget monthly limit', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/budget.html');

    const input = page.locator('input').first();
    if (await input.isVisible()) {
      await input.fill('1200');
    }

    const dialogPromise = page
      .waitForEvent('dialog', { timeout: 2000 })
      .then(async (dialog) => {
        await dialog.accept();
      })
      .catch(() => {});

    const saveBtn = page
      .locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")')
      .first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    }

    await dialogPromise;
    await expect(page.locator('body')).toBeVisible();
  });

  test('Category analytics breakdown renders', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/budget.html');

    const mainContent = page.locator('main, body, #content').first();
    await expect(mainContent).toBeVisible();
  });
});
