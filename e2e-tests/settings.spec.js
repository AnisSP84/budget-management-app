const { test, expect } = require('@playwright/test');

const settings = {
  user_id: 1,
  name: 'Alice Tan',
  username: 'alice',
  email: 'alice@example.com',
  dob: '1995-06-15',
  occupation: 'Designer',
  dark_mode: false,
  budget_notification: true,
  warning_threshold: 80,
  country_code: 'SG',
  currencyData: {
    SG: { symbol: 'SGD $', code: 'SGD', display: 'SGD ($)' },
  },
  exchangeRates: { SG: 1 },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
  });

  // The settings page refreshes a token on load. Return a response immediately
  // so this unrelated call cannot affect the UI assertions below.
  await page.route('**/api/auth/refresh', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 401,
      body: JSON.stringify({ error: 'No refresh token provided' }),
    });
  });
});

test('loads profile information from the settings API', async ({ page }) => {
  await page.route('**/api/settings/all', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: settings }),
    });
  });

  await page.goto('http://127.0.0.1:3000/settings.html');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('#settingsName')).toHaveValue('Alice Tan');
  await expect(page.locator('#settingsUsername')).toHaveValue('alice');
  await expect(page.locator('#settingsEmail')).toHaveValue('alice@example.com');
  await expect(page.locator('#settingsDob')).toHaveValue('1995-06-15');
  await expect(page.locator('#settingsOccupation')).toHaveValue('Designer');
  await expect(page.locator('#countrySelect')).toHaveValue('SG');
});

test('updates a profile password through the settings API', async ({ page }) => {
  const profileRequests = [];

  await page.route('**/api/settings/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (request.method() === 'GET' && pathname.endsWith('/settings/all')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: settings }),
      });
      return;
    }

    if (request.method() === 'PATCH' && pathname.endsWith('/settings/profile')) {
      profileRequests.push({
        body: request.postDataJSON(),
        authorization: request.headers().authorization,
      });
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Profile updated successfully' }),
      });
      return;
    }

    await route.fulfill({
      contentType: 'application/json',
      status: 404,
      body: JSON.stringify({ message: 'Unexpected settings request' }),
    });
  });

  await page.goto('http://127.0.0.1:3000/settings.html');
  await expect(page.locator('#settingsUsername')).toHaveValue('alice');

  await page.locator('#settingsPassword').fill('UpdatedPassword123!');
  await page.getByRole('button', { name: 'Save Information' }).click();

  await expect(page.locator('#toastMsg')).toHaveText('Password updated.');
  await expect(page.locator('#settingsPassword')).toHaveValue('');
  expect(profileRequests).toEqual([
    {
      body: { password: 'UpdatedPassword123!' },
      authorization: 'Bearer test-token',
    },
  ]);
});
