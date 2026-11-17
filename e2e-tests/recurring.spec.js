const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://127.0.0.1:3000';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
  });

  // Mock categories
  await page.route('**/api/categories', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        rows: [
          {
            category_id: 1,
            category_name: 'Entertainment',
            category_type: 'Expenses',
          },
        ],
      }),
    });
  });

  // Mock recurring list
  await page.route('**/api/recurringTransactions', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          rows: [
            {
              recurring_id: 1,
              description: 'Netflix Subscription',
              category_name: 'Entertainment',
              category_id: 1,
              amount: 20,
              frequency: 'Monthly',
              next_date: '2026-08-10',
              end_date: null,
              is_active: true,
            },
          ],
          count: 1,
        }),
      });
    }

    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Recurring transaction created successfully',
          recurringTransaction: {
            recurring_id: 2,
            description: 'Netflix Subscription',
          },
        }),
      });
    }
  });

  // Mock process recurring
  await page.route('**/api/recurringTransactions/process', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'Recurring transactions processed successfully',
      }),
    });
  });

  await page.goto(`${BASE_URL}/recurring.html`);
});

// -----------------------------
// Page Load
// -----------------------------

test.describe('Recurring Page Load', () => {
  test('should display recurring heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        name: 'Recurring Transactions',
        exact: true,
      }),
    ).toBeVisible();
  });

  test('should display add button', async ({ page }) => {
    await expect(
      page.getByRole('button', {
        name: /Add Recurring Transaction/,
      }),
    ).toBeVisible();
  });

  test('should display recurring table', async ({ page }) => {
    await expect(page.locator('#recurringTableBody')).toBeVisible();
  });
});

// -----------------------------
// Display Data
// -----------------------------

test.describe('Recurring Transaction List', () => {
  test('should display recurring transaction data', async ({ page }) => {
    await expect(page.locator('#recurringTableBody')).toContainText('Netflix Subscription');

    await expect(page.locator('#recurringTableBody')).toContainText('20.00');
  });

  test('should display summary cards', async ({ page }) => {
    await expect(page.locator('#totalRecurring')).toHaveText('1');

    await expect(page.locator('#activeRecurring')).toHaveText('1');
  });
});

// -----------------------------
// Create
// -----------------------------

test.describe('Create Recurring Transaction', () => {
  test('should create recurring transaction successfully', async ({ page }) => {
    await page.click('button[data-bs-target="#addRecurringModal"]');

    await page.fill('#description', 'Netflix Subscription');

    await page.selectOption('#category', '1');

    await page.fill('#amount', '20');

    await page.selectOption('#frequency', 'Monthly');

    await page.fill('#startDate', '2026-08-10');

    await page.click('#recurringForm button[type="submit"]');

    await expect(page.locator('#recurringTableBody')).toContainText('Netflix Subscription');
  });
});

// -----------------------------
// Update
// -----------------------------

test.describe('Update Recurring Transaction', () => {
  test('should update recurring transaction successfully', async ({ page }) => {
    await page.route('**/api/recurringTransactions/1', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            recurring_id: 1,
            category_id: 1,
            amount: 20,
            description: 'Netflix Subscription',
            frequency: 'Monthly',
            next_date: '2026-08-10',
            is_active: true,
          }),
        });
      }

      if (route.request().method() === 'PUT') {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Recurring transaction updated successfully',
          }),
        });
      }
    });

    await page.locator('.edit-btn').first().click();

    await page.fill('#editAmount', '30');

    await page.click('#editRecurringForm button[type="submit"]');
  });
});

// -----------------------------
// Delete
// -----------------------------

test.describe('Delete Recurring Transaction', () => {
  test('should delete recurring transaction successfully', async ({ page }) => {
    await page.route('**/api/recurringTransactions/1', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          message: 'Recurring transaction deleted successfully',
        }),
      });
    });

    await page.on('dialog', (dialog) => dialog.accept());

    await page.locator('.delete-btn').first().click();
  });
});

// -----------------------------
// Validation
// -----------------------------

test.describe('Validation', () => {
  test('should prevent create without required fields', async ({ page }) => {
    await page.click('button[data-bs-target="#addRecurringModal"]');

    await page.click('#recurringForm button[type="submit"]');

    await expect(page.locator('#amount')).toBeVisible();
  });

  test('should reject invalid frequency', async ({ page }) => {
    await page.route('**/api/recurringTransactions', async (route) => {
      await route.fulfill({
        status: 400,

        contentType: 'application/json',

        body: JSON.stringify({
          message: 'Frequency must be Daily, Weekly, Monthly or Yearly',
        }),
      });
    });
  });
});
