const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('budgetNotifications', 'true');
  });
});

test('renders notification data returned by the API', async ({ page }) => {
  await page.route('**/api/notifications/unread', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          notifications: [
            {
              notification_id: 12,
              type: 'warning',
              title: 'Budget warning',
              message: 'You have used 90% of your budget.',
              created_at: new Date().toISOString(),
              read: false,
            },
          ],
          counts: { total: 1, unread: 1 },
        },
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/notifications.html');

  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await expect(page.locator('.notification-title')).toHaveText('Budget warning');
  await expect(page.locator('.notification-message')).toHaveText(
    'You have used 90% of your budget.',
  );
  await expect(page.getByRole('button', { name: 'Mark read' })).toBeVisible();
});

test('mark all and clear all use their notification endpoints', async ({ page }) => {
  const calls = [];
  await page.route('**/api/notifications/**', async (route) => {
    calls.push({ method: route.request().method(), url: route.request().url() });
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  await page.goto('http://127.0.0.1:3000/notifications.html');
  await page.getByRole('button', { name: 'Mark All as Read' }).click();
  await expect(page.locator('#toastMsg')).toHaveText('All notifications marked as read');
  await page.getByRole('button', { name: 'Clear All' }).click();
  await expect(page.locator('#toastMsg')).toHaveText('All notifications cleared');

  expect(calls).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        method: 'PUT',
        url: expect.stringContaining('/notifications/read-all'),
      }),
      expect.objectContaining({
        method: 'DELETE',
        url: expect.stringContaining('/notifications/all'),
      }),
    ]),
  );
});
