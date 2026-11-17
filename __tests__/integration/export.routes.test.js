const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/services/db');

let userToken = '';
let userId = '';

beforeEach(async () => {
  // Clean slate for every test.
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM budgets');
  await pool.query('DELETE FROM transactions');
  await pool.query('DELETE FROM categories');
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users');

  // Seed user via register endpoint
  const authRes = await request(app).post('/api/auth/register').send({
    username: 'exportuser',
    email: 'exportuser@example.com',
    password: 'Password123!',
    captchaInput: '1234',
    captchaAnswer: '1234',
  });

  if (authRes.status !== 200) {
    throw new Error(`Failed to seed user in beforeEach. Response: ${JSON.stringify(authRes.body)}`);
  }

  userToken = authRes.body.token;

  // Retrieve user ID
  const userQuery = await pool.query("SELECT user_id FROM users WHERE username = 'exportuser'");
  if (userQuery.rows.length === 0) {
    throw new Error('User was not found in the database after registration.');
  }
  userId = userQuery.rows[0].user_id;

  // Seed a category for expenses
  await pool.query(
    `INSERT INTO categories (category_id, category_name, category_type) VALUES (1, 'Food', 'Expenses') ON CONFLICT DO NOTHING`,
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM budgets');
  await pool.query('DELETE FROM transactions');
  await pool.query('DELETE FROM categories');
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users');
  await pool.end();
});

// ─────────────────────────────────────────────────────────
// GET /api/export/csv
// ─────────────────────────────────────────────────────────
describe('GET /api/export/csv', () => {
  test('should return 401 if no authorization token is provided', async () => {
    const res = await request(app).get('/api/export/csv');
    expect(res.status).toBe(401);
  });

  test('should return 401 if an invalid or malformed token is provided', async () => {
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', 'Bearer invalidtoken123');

    expect(res.status).toBe(401);
  });

  test('should return 200, correct CSV headers, and default 0 values when no budget or expenses exist', async () => {
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe('attachment; filename="financial_summary.csv"');

    // Verify CSV content text sections and defaults
    const csvText = res.text;
    expect(csvText).toContain('--- FINANCIAL SUMMARY REPORT ---');
    expect(csvText).toContain('Monthly Budget Limit,0.00');
    expect(csvText).toContain('Total Spent,0.00');
    expect(csvText).toContain('Remaining Budget,0.00');
    expect(csvText).toContain('No recorded expenses for this month,0.00');
  });

  test('should return 200 and accurate CSV content reflecting budget, spent total, and category breakdown', async () => {
    // 1. Insert a budget
    await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, description) VALUES ($1, 1, 1200.00, 'Monthly')`,
      [userId],
    );

    // 2. Insert transactions belonging to the current month
    await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, transaction_date) VALUES ($1, 1, 350.50, CURRENT_DATE)`,
      [userId],
    );

    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toBe('attachment; filename="financial_summary.csv"');

    const csvText = res.text;
    expect(csvText).toContain('Monthly Budget Limit,1200.00');
    expect(csvText).toContain('Total Spent,350.50');
    expect(csvText).toContain('Remaining Budget,849.50');
    expect(csvText).toContain('"Food",350.50');
  });
});
