const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const pool = require('../../src/services/db');
const model = require('../../src/models/reportModel');

const BASE_PATH = '/api/report';

// ── DB Setup / Teardown ──────────────────────────────────
beforeEach(async () => {
  await pool.query('DELETE FROM "transactions"');
  await pool.query('DELETE FROM "categories"');
  await pool.query('DELETE FROM "users"');
});

afterAll(async () => {
  await pool.query('DELETE FROM "transactions"');
  await pool.query('DELETE FROM "categories"');
  await pool.query('DELETE FROM "users"');
  await pool.end();
});

// ── Helpers ───────────────────────────────────────────────
function signToken(userId) {
  return jwt.sign({ userId, timestamp: new Date() }, process.env.JWT_SECRET_KEY, {
    expiresIn: '1h',
  });
}

let usernameCounter = 0;
async function seedUser(username) {
  usernameCounter += 1;
  const uniqueUsername = username || `reportuser${usernameCounter}`;
  const result = await pool.query(
    `INSERT INTO "users" (username, email, password) VALUES ($1, $2, $3) RETURNING user_id`,
    [uniqueUsername, `${uniqueUsername}@example.com`, 'hashedpassword'],
  );
  return result.rows[0].user_id;
}

let categoryCounter = 0;
async function seedCategory(name, type = 'Expenses') {
  categoryCounter += 1;
  const uniqueName = name || `Cat${categoryCounter}`;
  const result = await pool.query(
    `INSERT INTO "categories" (category_name, category_type) VALUES ($1, $2) RETURNING category_id`,
    [uniqueName, type],
  );
  return result.rows[0].category_id;
}

async function seedTransaction(userId, categoryId, amount, dateOverride = null) {
  const query = `
    INSERT INTO transactions (user_id, category_id, amount, description, transaction_date)
    VALUES ($1, $2, $3, 'Test Transaction', COALESCE($4, NOW()))
    RETURNING *
  `;
  const result = await pool.query(query, [userId, categoryId, amount, dateOverride]);
  return result.rows[0];
}

async function setupAuthedUser() {
  const userId = await seedUser();
  const token = signToken(userId);
  return { userId, token };
}

// ─────────────────────────────────────────────────────────
// GET /summary
// ─────────────────────────────────────────────────────────
describe(`GET ${BASE_PATH}/summary`, () => {
  test('should return 200 and the summary report (defaults to monthly)', async () => {
    const { userId, token } = await setupAuthedUser();
    const categoryId = await seedCategory('Groceries', 'Expenses');
    await seedTransaction(userId, categoryId, 50);

    const res = await request(app)
      .get(`${BASE_PATH}/summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.report)).toBe(true);
  });

  // Hits the daily, weekly, and yearly if-statements in the model
  test.each(['daily', 'weekly', 'yearly'])(
    'should return 200 and handle the %s period correctly',
    async (period) => {
      const { userId, token } = await setupAuthedUser();
      const categoryId = await seedCategory('Groceries', 'Expenses');
      await seedTransaction(userId, categoryId, 50);

      const res = await request(app)
        .get(`${BASE_PATH}/summary?period=${period}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    },
  );

  test('should return 400 for an invalid period type', async () => {
    const { token } = await setupAuthedUser();
    const res = await request(app)
      .get(`${BASE_PATH}/summary?period=decade`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid period type.');
  });

  test('should return 400 when user id is missing/null (Line 21 Coverage)', async () => {
    // Creating a token with a null userId to bypass standard auth checks but hit controller logic
    const badToken = signToken(null);
    const res = await request(app)
      .get(`${BASE_PATH}/summary`)
      .set('Authorization', `Bearer ${badToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing user id.');
  });

  test('should return 500 if database query fails (Lines 28-30 Coverage)', async () => {
    const { token } = await setupAuthedUser();
    const spy = jest.spyOn(model, 'selectSummaryReport').mockImplementation((data, cb) => {
      cb(new Error('Simulated Database Error'), null);
    });

    const res = await request(app)
      .get(`${BASE_PATH}/summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// GET /category
// ─────────────────────────────────────────────────────────
describe(`GET ${BASE_PATH}/category`, () => {
  test('should return 200 and the category breakdown', async () => {
    const { userId, token } = await setupAuthedUser();
    const categoryId = await seedCategory('Entertainment', 'Expenses');
    await seedTransaction(userId, categoryId, 120.5);

    const res = await request(app)
      .get(`${BASE_PATH}/category?period=weekly`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report.length).toBeGreaterThan(0);
    expect(res.body.report[0].category_name).toBe('Entertainment');
  });

  // Hits the daily, monthly, and yearly if-statements in the model
  test.each(['daily', 'monthly', 'yearly'])(
    'should return 200 and handle the %s period correctly',
    async (period) => {
      const { userId, token } = await setupAuthedUser();
      const categoryId = await seedCategory('Entertainment', 'Expenses');
      await seedTransaction(userId, categoryId, 120.5);

      const res = await request(app)
        .get(`${BASE_PATH}/category?period=${period}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    },
  );
  // Hits the daily, monthly, and yearly if-statements in the model
  test.each(['daily', 'monthly', 'yearly'])(
    'should return 200 and handle the %s period correctly',
    async (period) => {
      const { userId, token } = await setupAuthedUser();
      const categoryId = await seedCategory('Entertainment', 'Expenses');
      await seedTransaction(userId, categoryId, 120.5);

      const res = await request(app)
        .get(`${BASE_PATH}/category?period=${period}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    },
  );

  test('should return 400 for an invalid period type', async () => {
    const { token } = await setupAuthedUser();
    const res = await request(app)
      .get(`${BASE_PATH}/category?period=hourly`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid period type.');
  });

  test('should return 500 if database query fails (Lines 57-58 Coverage)', async () => {
    const { token } = await setupAuthedUser();
    const spy = jest.spyOn(model, 'selectCategoryBreakdown').mockImplementation((data, cb) => {
      cb(new Error('Simulated Database Error'), null);
    });

    const res = await request(app)
      .get(`${BASE_PATH}/category`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// GET /dashboard-summary
// ─────────────────────────────────────────────────────────
describe(`GET ${BASE_PATH}/dashboard-summary`, () => {
  test('should return 200 and calculate total income and spending', async () => {
    const { userId, token } = await setupAuthedUser();
    const expCat = await seedCategory('Rent', 'Expenses');
    const incCat = await seedCategory('Salary', 'Income');

    await seedTransaction(userId, expCat, 500);
    await seedTransaction(userId, incCat, 2000);

    const res = await request(app)
      .get(`${BASE_PATH}/dashboard-summary?period=yearly`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.total_spending)).toBe(500);
    expect(Number(res.body.total_income)).toBe(2000);
  });

  test('should return 0 totals if no data exists (Line 82 Coverage)', async () => {
    const { token } = await setupAuthedUser();

    // Forcing the mock to return exactly 0 rows to hit the fallback block
    const spy = jest.spyOn(model, 'selectDashboardSummary').mockImplementation((data, cb) => {
      cb(null, { rows: [] });
    });

    const res = await request(app)
      .get(`${BASE_PATH}/dashboard-summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total_income).toBe(0);
    expect(res.body.total_spending).toBe(0);

    spy.mockRestore();
  });

  test('should return 500 if database query fails (Lines 77-78 Coverage)', async () => {
    const { token } = await setupAuthedUser();
    const spy = jest.spyOn(model, 'selectDashboardSummary').mockImplementation((data, cb) => {
      cb(new Error('Simulated Database Error'), null);
    });

    const res = await request(app)
      .get(`${BASE_PATH}/dashboard-summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// GET /export/csv
// ─────────────────────────────────────────────────────────
describe(`GET ${BASE_PATH}/export/csv`, () => {
  test('should return 200 and output a valid CSV string format', async () => {
    const { userId, token } = await setupAuthedUser();
    const categoryId = await seedCategory('Snacks', 'Expenses');
    await seedTransaction(userId, categoryId, 10.5);

    const res = await request(app)
      .get(`${BASE_PATH}/export/csv?period=monthly`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename=report_monthly.csv');
    expect(res.text).toContain('Date,Category,Amount,Description\n');
    expect(res.text).toContain('Snacks');
    expect(res.text).toContain('10.5');
  });

  test('should return 500 if database query fails (Lines 101-102 Coverage)', async () => {
    const { token } = await setupAuthedUser();
    const spy = jest.spyOn(model, 'selectExportTransactions').mockImplementation((data, cb) => {
      cb(new Error('Simulated Export Error'), null);
    });

    const res = await request(app)
      .get(`${BASE_PATH}/export/csv`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
    spy.mockRestore();
  });
});
