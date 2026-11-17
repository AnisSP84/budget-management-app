const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
  });

  await page.route('**/api/report/dashboard-summary**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        total_spending: 200,
        total_income: 3000,
      }),
    });
  });

  await page.route('**/api/report/category**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        report: [
          {
            category_name: 'Food',
            category_type: 'Expenses',
            total: 200,
          },
          {
            category_name: 'Transport',
            category_type: 'Expenses',
            total: 50,
          },
          {
            category_name: 'Salary',
            category_type: 'Income',
            total: 3000,
          },
        ],
      }),
    });
  });

  await page.route('**/api/report/summary**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        report: [
          {
            period: 'May 2026',
            total: 200,
          },
        ],
      }),
    });
  });

  await page.goto('http://127.0.0.1:3000/report.html');
});

// -----------------------------
// Page Load
// -----------------------------
test.describe('Report Page Load', () => {
  test('should display Report heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Report', exact: true })).toBeVisible();
  });

  test('should display report buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Daily' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Weekly' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Monthly' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Yearly' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Download CSV' })).toBeVisible();
  });

  test('should display summary table headers', async ({ page }) => {
    const headers = page.locator('thead th');

    await expect(headers.nth(0)).toHaveText('Period');

    await expect(headers.nth(1)).toHaveText('Total Spending');
  });

  test('should display dashboard cards', async ({ page }) => {
    await expect(page.locator('#totalSpending')).toBeVisible();

    await expect(page.locator('#totalIncome')).toBeVisible();

    await expect(page.locator('#netBalance')).toBeVisible();
  });

  test('should display chart selector', async ({ page }) => {
    await expect(page.locator('#chartType')).toBeVisible();
  });
});

// -----------------------------
// Summary Report
// -----------------------------
test.describe('Summary Report', () => {
  test('should load monthly report by default', async ({ page }) => {
    await expect(page.locator('#reportBody')).toBeVisible();
  });

  test('should load daily report', async ({ page }) => {
    await page
      .getByRole('button', {
        name: 'Daily',
      })
      .click();

    await expect(page.locator('#reportBody')).toBeVisible();
  });

  test('should load weekly report', async ({ page }) => {
    await page
      .getByRole('button', {
        name: 'Weekly',
      })
      .click();

    await expect(page.locator('#reportBody')).toBeVisible();
  });

  test('should load yearly report', async ({ page }) => {
    await page
      .getByRole('button', {
        name: 'Yearly',
      })
      .click();

    await expect(page.locator('#reportBody')).toBeVisible();
  });
});

// -----------------------------
// Dashboard Cards
// -----------------------------
test.describe('Dashboard Cards', () => {
  test('should display dashboard values', async ({ page }) => {
    await expect(page.locator('#totalSpending')).toContainText('200');

    await expect(page.locator('#totalIncome')).toContainText('3000');

    await expect(page.locator('#netBalance')).toContainText('2800');
  });
});

// -----------------------------
// Chart
// -----------------------------
test.describe('Chart', () => {
  test('should display chart canvas', async ({ page }) => {
    await expect(page.locator('#reportChart')).toBeVisible();
  });

  test('should switch chart type', async ({ page }) => {
    await page.locator('#chartType').selectOption('bar');

    await expect(page.locator('#chartType')).toHaveValue('bar');

    await page.locator('#chartType').selectOption('pie');

    await expect(page.locator('#chartType')).toHaveValue('pie');
  });
});

// -----------------------------
// Top Categories
// -----------------------------
test.describe('Top Categories', () => {
  test('should display top categories section', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        name: 'Top 3 Spending Categories',
      }),
    ).toBeVisible();
  });

  test('should display category list', async ({ page }) => {
    await expect(page.locator('#topCategories')).toBeVisible();
  });
});

// -----------------------------
// CSV Export
// -----------------------------
test.describe('CSV Export', () => {
  test('should download csv report', async ({ page }) => {
    await page.route('**/api/report/export/csv', async (route) => {
      await route.fulfill({
        contentType: 'text/csv',
        body: 'Period,Total Spending\nMay 2026,200',
      });
    });

    const downloadPromise = page.waitForEvent('download');

    await page
      .getByRole('button', {
        name: 'Download CSV',
      })
      .click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.csv');
  });
});

// -----------------------------
// Boundary Cases
// -----------------------------
test.describe('Boundary Cases', () => {
  test('should keep report table visible', async ({ page }) => {
    await expect(page.locator('#reportBody')).toBeVisible();
  });

  test('should keep dashboard cards visible', async ({ page }) => {
    await expect(page.locator('#totalSpending')).toBeVisible();

    await expect(page.locator('#totalIncome')).toBeVisible();

    await expect(page.locator('#netBalance')).toBeVisible();
  });

  test('chart selector should only allow pie or bar', async ({ page }) => {
    const options = await page.locator('#chartType option').allTextContents();

    expect(options).toEqual(['Pie Chart', 'Bar Chart']);
  });
});
