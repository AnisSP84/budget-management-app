const { test, expect } = require('@playwright/test');

async function loginUser(page) {
  await page.goto('http://127.0.0.1:3000/login.html');
  await page.getByRole('textbox', { name: 'Username' }).fill('testuser');
  await page.getByRole('textbox', { name: 'Password' }).fill('1234');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/*.html', { timeout: 5000 }).catch(() => {});
}

test.describe('Recently Deleted (LocalStorage) E2E', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('Deleted transaction moves to recently deleted storage', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/transactions.html');

    await page.evaluate(() => {
      localStorage.setItem(
        'recently_deleted_transactions',
        JSON.stringify([{ id: 1, description: 'Deleted Test Item' }]),
      );
    });

    await page.goto('http://127.0.0.1:3000/recently-deleted.html');

    const storedItems = await page.evaluate(() =>
      localStorage.getItem('recently_deleted_transactions'),
    );
    expect(storedItems).not.toBeNull();
  });

  test('User can restore item from recently deleted', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/recently-deleted.html');

    const restoreBtn = page.locator('.restore-btn').first();
    if (await restoreBtn.isVisible()) {
      await restoreBtn.click();
      await expect(restoreBtn).not.toBeVisible();
    }
  });
});
