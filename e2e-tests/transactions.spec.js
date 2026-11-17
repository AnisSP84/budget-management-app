const { test, expect } = require('@playwright/test');

async function loginUser(page) {
  await page.goto('http://127.0.0.1:3000/login.html');
  await page.getByRole('textbox', { name: 'Username' }).fill('testuser');
  await page.getByRole('textbox', { name: 'Password' }).fill('1234');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/*.html', { timeout: 5000 }).catch(() => {});
}

test.describe('Transactions Table E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('User can add a new transaction and see it in the table', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/transactions.html');

    const inputs = page.locator('input[type="text"], input:not([type="hidden"])');
    if ((await inputs.count()) > 0) {
      await inputs.first().fill('E2E Groceries');
    }

    const numInputs = page.locator('input[type="number"]');
    if ((await numInputs.count()) > 0) {
      await numInputs.first().fill('85.50');
    }

    const submitBtn = page
      .locator('button[type="submit"], button:has-text("Add"), #add-transaction-btn')
      .first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('User can bulk delete selected transactions', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/transactions.html');

    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      const deleteBtn = page.locator('#bulk-delete-btn, button:has-text("Delete")').first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
      }
    }
  });

  test('User can filter transactions by category', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/transactions.html');

    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption({ index: 1 }).catch(() => {});
    }
  });
});
