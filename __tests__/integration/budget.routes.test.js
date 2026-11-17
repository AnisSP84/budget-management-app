const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/services/db');

let userToken = '';
let userId = '';
let categoryId = null;
let incomeCategoryId = null;

beforeEach(async () => {
  // Register test user with a unique username/email to avoid collisions
  // with other suites running concurrently against the shared test DB.
  const timestamp = Date.now() + Math.floor(Math.random() * 1000000);
  const testUser = {
    username: `budgetuser_${timestamp}`,
    email: `budgetuser_${timestamp}@example.com`,
    password: 'Password123!',
    captchaInput: '1234',
    captchaAnswer: '1234',
  };

  const authRes = await request(app).post('/api/auth/register').send(testUser);

  if (authRes.status !== 200) {
    throw new Error(`Failed to seed user in beforeEach. Response: ${JSON.stringify(authRes.body)}`);
  }

  userToken = authRes.body.token;

  const userQuery = await pool.query('SELECT user_id FROM users WHERE username = $1', [
    testUser.username,
  ]);
  if (userQuery.rows.length === 0) {
    throw new Error('User was not found in the database after registration.');
  }
  userId = userQuery.rows[0].user_id;

  // Insert a unique category per test run instead of a hardcoded ID —
  // avoids colliding with categories other suites create/seed concurrently.
  const catRes = await pool.query(
    `INSERT INTO categories (category_name, category_type)
     VALUES ($1, 'Expenses') RETURNING category_id`,
    [`Budget Test Food ${timestamp}`],
  );
  categoryId = catRes.rows[0].category_id;
});

afterEach(async () => {
  // Only clean up rows this test created, not entire shared tables.
  if (userId) {
    await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
  }
  if (categoryId) {
    await pool.query('DELETE FROM categories WHERE category_id = $1', [categoryId]);
  }
  if (incomeCategoryId) {
    await pool.query('DELETE FROM categories WHERE category_id = $1', [incomeCategoryId]);
    incomeCategoryId = null;
  }
});

afterAll(async () => {
  await pool.end();
});

// ─────────────────────────────────────────────────────────
// PUT /api/budget (Update or Insert)
// ─────────────────────────────────────────────────────────
describe('PUT /api/budget', () => {
  test('should return 401 if no authorization token is provided', async () => {
    const res = await request(app).put('/api/budget').send({ amount: 500 });
    expect(res.status).toBe(401);
  });

  test('should return 401 if an invalid or malformed authorization token is provided', async () => {
    const res = await request(app)
      .put('/api/budget')
      .set('Authorization', 'Bearer invalidtoken123')
      .send({ amount: 500 });

    expect(res.status).toBe(401);
  });

  test('should return 400 if amount is missing', async () => {
    const res = await request(app)
      .put('/api/budget')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Amount is required.');
  });

  test('should create a new budget if none exists', async () => {
    const res = await request(app)
      .put('/api/budget')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Budget updated successfully.');

    const dbCheck = await pool.query('SELECT amount FROM budgets WHERE user_id = $1', [userId]);
    expect(Number(dbCheck.rows[0].amount)).toBe(1000);
  });

  test('should update existing budget if one exists', async () => {
    // Insert initial budget
    await pool.query(`INSERT INTO budgets (user_id, category_id, amount) VALUES ($1, $2, 500)`, [
      userId,
      categoryId,
    ]);

    const res = await request(app)
      .put('/api/budget')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 2000 });

    expect(res.status).toBe(200);

    const dbCheck = await pool.query('SELECT amount FROM budgets WHERE user_id = $1', [userId]);
    expect(Number(dbCheck.rows[0].amount)).toBe(2000);
  });

  test('should successfully upsert (update if exists) when PUT is called multiple times', async () => {
    await request(app)
      .put('/api/budget')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 500 });

    const res = await request(app)
      .put('/api/budget')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ amount: 1200 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Budget updated successfully.');

    const dbCheck = await pool.query('SELECT amount FROM budgets WHERE user_id = $1', [userId]);
    expect(Number(dbCheck.rows[0].amount)).toBe(1200);
  });
});

// ─────────────────────────────────────────────────────────
// GET /api/budget
// ─────────────────────────────────────────────────────────
describe('GET /api/budget', () => {
  test('should return 200 and a 0 amount if no budget is set', async () => {
    const res = await request(app).get('/api/budget').set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(0.0);
    expect(res.body.description).toBe('No Budget Set');
  });

  test('should return 200 and the correct budget amount if set', async () => {
    await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, description) VALUES ($1, $2, 1500, 'Test Budget')`,
      [userId, categoryId],
    );

    const res = await request(app).get('/api/budget').set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.amount)).toBe(1500);
    expect(res.body.description).toBe('Test Budget');
  });
});

// ─────────────────────────────────────────────────────────
// GET /api/budget/summary
// ─────────────────────────────────────────────────────────
describe('GET /api/budget/summary', () => {
  test('should return 200 with 0s if no budget or transactions exist', async () => {
    const res = await request(app)
      .get('/api/budget/summary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.budget_limit)).toBe(0);
    expect(Number(res.body.total_spent)).toBe(0);
  });

  test('should return 200 with correct budget and spent amounts for the current month', async () => {
    await pool.query(`INSERT INTO budgets (user_id, category_id, amount) VALUES ($1, $2, 1000)`, [
      userId,
      categoryId,
    ]);

    // Insert a transaction for the current month
    await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, transaction_date) VALUES ($1, $2, 250, CURRENT_DATE)`,
      [userId, categoryId],
    );

    const res = await request(app)
      .get('/api/budget/summary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.budget_limit)).toBe(1000);
    expect(Number(res.body.total_spent)).toBe(250);
  });

  test('should ignore Income categories and only sum Expenses in total_spent', async () => {
    await pool.query(`INSERT INTO budgets (user_id, category_id, amount) VALUES ($1, $2, 1000)`, [
      userId,
      categoryId,
    ]);

    const incomeRes = await pool.query(
      `INSERT INTO categories (category_name, category_type) VALUES ($1, 'Income') RETURNING category_id`,
      [`Budget Test Salary ${Date.now()}`],
    );
    incomeCategoryId = incomeRes.rows[0].category_id;

    await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, transaction_date) VALUES ($1, $2, 200, CURRENT_DATE)`,
      [userId, categoryId],
    );

    await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, transaction_date) VALUES ($1, $2, 5000, CURRENT_DATE)`,
      [userId, incomeCategoryId],
    );

    const res = await request(app)
      .get('/api/budget/summary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.budget_limit)).toBe(1000);
    expect(Number(res.body.total_spent)).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────
// GET /api/budget/analytics
// ─────────────────────────────────────────────────────────
describe('GET /api/budget/analytics', () => {
  test('should return 200 and an empty array if no transactions exist', async () => {
    const res = await request(app)
      .get('/api/budget/analytics')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('should return 200 and category breakdown for current month expenses', async () => {
    await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, transaction_date) VALUES ($1, $2, 300, CURRENT_DATE)`,
      [userId, categoryId],
    );

    const res = await request(app)
      .get('/api/budget/analytics')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(Number(res.body[0].total_amount)).toBe(300);
  });
});

// ─────────────────────────────────────────────────────────
// POST /api/budget/notifications
// ─────────────────────────────────────────────────────────
describe('POST /api/budget/notifications', () => {
  test('should return 400 if required fields are missing (e.g. type)', async () => {
    const res = await request(app)
      .post('/api/budget/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'Budget exceeded', title: 'Alert' }); // Missing type

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing required notification fields.');
  });

  test('should return 400 if title is missing', async () => {
    const res = await request(app)
      .post('/api/budget/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ message: 'Close to limit', type: 'WARNING' }); // Missing title

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing required notification fields.');
  });

  test('should return 201 and log an EXCEEDED notification successfully', async () => {
    const res = await request(app)
      .post('/api/budget/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        message: 'You have exceeded your food budget.',
        type: 'EXCEEDED',
        title: 'Budget Alert',
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Budget breach notification logged successfully.');

    const dbCheck = await pool.query('SELECT * FROM notifications WHERE user_id = $1', [userId]);
    expect(dbCheck.rows).toHaveLength(1);
    expect(dbCheck.rows[0].title).toBe('Budget Alert');
    expect(dbCheck.rows[0].type).toBe('EXCEEDED');
  });

  test('should return 201 and log a WARNING type notification successfully', async () => {
    const res = await request(app)
      .post('/api/budget/notifications')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        message: 'You are nearing your budget limit.',
        type: 'WARNING',
        title: 'Budget Warning',
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Budget breach notification logged successfully.');

    const dbCheck = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND type = $2',
      [userId, 'WARNING'],
    );
    expect(dbCheck.rows).toHaveLength(1);
    expect(dbCheck.rows[0].title).toBe('Budget Warning');
  });
});
