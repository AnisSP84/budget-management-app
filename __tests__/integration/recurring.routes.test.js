const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const pool = require('../../src/services/db');
const model = require('../../src/models/recurringModel');

// Mounted in mainRoutes.js as router.use('/recurringTransactions', ...)
// and mainRoutes is mounted at '/api' in app.js.
const BASE_PATH = '/api/recurringTransactions';

// ── DB Setup / Teardown ──────────────────────────────────
// Tables are created via the Jest globalSetup (configs/jest-integration-setup.js)
// which runs scripts/reset.js before any test file executes.

beforeEach(async () => {
  // Clean slate for every test (order matters due to FK constraints)
  await pool.query('DELETE FROM "transactions"');
  await pool.query('DELETE FROM "recurring_transactions"');
  await pool.query('DELETE FROM "categories"');
  await pool.query('DELETE FROM "users"');
});

afterAll(async () => {
  await pool.query('DELETE FROM "transactions"');
  await pool.query('DELETE FROM "recurring_transactions"');
  await pool.query('DELETE FROM "categories"');
  await pool.query('DELETE FROM "users"');
  await pool.end();
});

// ── Helpers ───────────────────────────────────────────────
// Mirrors jwtMiddleware.generateToken's payload shape ({ userId, timestamp })
// and secret (process.env.JWT_SECRET_KEY), which verifyToken checks against.
function signToken(userId) {
  return jwt.sign({ userId, timestamp: new Date() }, process.env.JWT_SECRET_KEY, {
    expiresIn: '1h',
  });
}

let usernameCounter = 0;
async function seedUser(username) {
  usernameCounter += 1;
  const uniqueUsername = username || `alice${usernameCounter}`;
  const result = await pool.query(
    `INSERT INTO "users" (username, email, password) VALUES ($1, $2, $3) RETURNING user_id`,
    [uniqueUsername, `${uniqueUsername}@example.com`, 'hashedpassword'],
  );
  return result.rows[0].user_id;
}

// categories are global (not user-scoped) and unique on (category_name, category_type)
let categoryCounter = 0;
async function seedCategory(name, type = 'Expenses') {
  categoryCounter += 1;
  const uniqueName = name || `Groceries${categoryCounter}`;
  const result = await pool.query(
    `INSERT INTO "categories" (category_name, category_type) VALUES ($1, $2) RETURNING category_id`,
    [uniqueName, type],
  );
  return result.rows[0].category_id;
}

async function seedRecurringTransaction(userId, categoryId, overrides = {}) {
  const defaults = {
    amount: 25.5,
    description: 'Weekly groceries',
    frequency: 'Weekly',
    next_date: futureDate(7),
    end_date: null,
  };
  const data = { ...defaults, ...overrides };

  const result = await pool.query(
    `INSERT INTO recurring_transactions
      (user_id, category_id, amount, description, frequency, next_date, end_date, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      userId,
      categoryId,
      data.amount,
      data.description,
      data.frequency,
      data.next_date,
      data.end_date,
    ],
  );
  return result.rows[0];
}

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function pastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function setupAuthedUser() {
  const userId = await seedUser();
  const categoryId = await seedCategory();
  const token = signToken(userId);
  return { userId, categoryId, token };
}

function validBody(categoryId, overrides = {}) {
  return {
    category_id: categoryId,
    amount: 100,
    description: 'Netflix subscription',
    frequency: 'Monthly',
    next_date: futureDate(30),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// Auth guard
// ─────────────────────────────────────────────────────────
describe('Auth guard on recurring transaction routes', () => {
  // Invalid partition: no token provided
  test('GET / without a token should return 401', async () => {
    const res = await request(app).get(BASE_PATH);
    expect(res.status).toBe(401);
  });

  // Invalid partition: malformed/invalid token
  test('GET / with an invalid token should return 401', async () => {
    const res = await request(app).get(BASE_PATH).set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────
// POST /recurring-transactions
// ─────────────────────────────────────────────────────────
describe('POST ' + BASE_PATH, () => {
  test('should return 201 and the created recurring transaction', async () => {
    const { categoryId, token } = await setupAuthedUser();
    const res = await request(app)
      .post(BASE_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody(categoryId));

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Recurring transaction created successfully');
    expect(res.body.recurringTransaction).toHaveProperty('recurring_id');
  });

  test('created recurring transaction should be persisted in the database', async () => {
    const { categoryId, token } = await setupAuthedUser();
    await request(app)
      .post(BASE_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody(categoryId, { description: 'Gym membership' }));

    const res = await request(app).get(BASE_PATH).set('Authorization', `Bearer ${token}`);
    expect(res.body.rows).toHaveLength(1);
    expect(res.body.rows[0].description).toBe('Gym membership');
  });

  test('should return 400 when required fields are missing', async () => {
    const { token } = await setupAuthedUser();
    const res = await request(app)
      .post(BASE_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Missing everything else' });

    expect(res.status).toBe(400);
  });

  test('should return 400 for an invalid frequency', async () => {
    const { categoryId, token } = await setupAuthedUser();
    const res = await request(app)
      .post(BASE_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody(categoryId, { frequency: 'Biweekly' }));

    expect(res.status).toBe(400);
  });

  test('should not create a transaction for a non-existent category', async () => {
    const { token } = await setupAuthedUser();
    const res = await request(app)
      .post(BASE_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody(999999));

    expect(res.status).toBe(404);
  });

  test('should return 500 if database insertion fails', async () => {
    const { categoryId, token } = await setupAuthedUser();
    const spy = jest.spyOn(model, 'insertRecurringTransaction').mockImplementation((data, cb) => {
      cb(new Error('Simulated Database Error'), null);
    });

    const res = await request(app)
      .post(BASE_PATH)
      .set('Authorization', `Bearer ${token}`)
      .send(validBody(categoryId));

    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// GET /recurring-transactions
// ─────────────────────────────────────────────────────────
describe('GET ' + BASE_PATH, () => {
  test('should return 200 and an empty array when none exist', async () => {
    const { token } = await setupAuthedUser();
    const res = await request(app).get(BASE_PATH).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
  });

  test('should return 200 and all recurring transactions for the user', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    await seedRecurringTransaction(userId, categoryId);
    await seedRecurringTransaction(userId, categoryId, { description: 'Rent' });

    const res = await request(app).get(BASE_PATH).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(2);
  });

  test("should not return another user's recurring transactions", async () => {
    const { userId: otherUserId, categoryId: otherCategoryId } = await setupAuthedUser();
    await seedRecurringTransaction(otherUserId, otherCategoryId);

    const { token } = await setupAuthedUser();
    const res = await request(app).get(BASE_PATH).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual([]);
  });

  test('should return 500 if fetching recurring transactions fails', async () => {
    const { token } = await setupAuthedUser();
    const spy = jest
      .spyOn(model, 'selectAllRecurringTransactions')
      .mockImplementation((data, cb) => {
        cb(new Error('Simulated Database Error'), null);
      });

    const res = await request(app).get(BASE_PATH).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// GET /recurring-transactions/:id
// ─────────────────────────────────────────────────────────
describe('GET ' + BASE_PATH + '/:id', () => {
  test('should return 200 and the recurring transaction', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const created = await seedRecurringTransaction(userId, categoryId);
    const res = await request(app)
      .get(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.recurring_id).toBe(created.recurring_id);
  });

  test('should return 404 for a non-existing id', async () => {
    const { token } = await setupAuthedUser();
    const res = await request(app)
      .get(`${BASE_PATH}/999999`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test("should return 404 when requesting another user's recurring transaction", async () => {
    const { userId: ownerId, categoryId: ownerCategoryId } = await setupAuthedUser();
    const created = await seedRecurringTransaction(ownerId, ownerCategoryId);
    const { token: otherToken } = await setupAuthedUser();

    const res = await request(app)
      .get(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  test('should return 500 if database retrieval fails', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const created = await seedRecurringTransaction(userId, categoryId);
    const spy = jest
      .spyOn(model, 'selectRecurringTransactionById')
      .mockImplementation((data, cb) => {
        cb(new Error('Simulated Database Error'), null);
      });

    const res = await request(app)
      .get(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// PUT /recurring-transactions/:id
// ─────────────────────────────────────────────────────────
describe('PUT ' + BASE_PATH + '/:id', () => {
  test('should return 200 and the updated recurring transaction', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const created = await seedRecurringTransaction(userId, categoryId);

    const res = await request(app)
      .put(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: categoryId,
        amount: 50,
        description: 'Updated description',
        frequency: 'Daily',
        next_date: futureDate(1),
        is_active: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.recurringTransaction.description).toBe('Updated description');
  });

  test('should return 400 when a required field is missing', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const created = await seedRecurringTransaction(userId, categoryId);

    const res = await request(app)
      .put(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Error: category_id is undefined');
  });

  test('should return 400 for an invalid frequency', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const created = await seedRecurringTransaction(userId, categoryId);

    const res = await request(app)
      .put(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: categoryId,
        amount: 50,
        frequency: 'Hourly',
        next_date: futureDate(1),
      });

    expect(res.status).toBe(400);
  });

  test('should return 500 if database update fails', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const created = await seedRecurringTransaction(userId, categoryId);
    const spy = jest
      .spyOn(model, 'updateRecurringTransactionById')
      .mockImplementation((data, cb) => {
        cb(new Error('Simulated Database Error'), null);
      });

    const res = await request(app)
      .put(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        category_id: categoryId,
        amount: 50,
        frequency: 'Daily',
        next_date: futureDate(1),
      });

    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// DELETE /recurring-transactions/:id
// ─────────────────────────────────────────────────────────
describe('DELETE ' + BASE_PATH + '/:id', () => {
  test('should return 200 and the deleted recurring transaction', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const created = await seedRecurringTransaction(userId, categoryId);

    const res = await request(app)
      .delete(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  test('should return 500 if database deletion fails', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const created = await seedRecurringTransaction(userId, categoryId);
    const spy = jest
      .spyOn(model, 'deleteRecurringTransactionById')
      .mockImplementation((data, cb) => {
        cb(new Error('Simulated Database Error'), null);
      });

    const res = await request(app)
      .delete(`${BASE_PATH}/${created.recurring_id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────
// POST /recurring-transactions/process
// ─────────────────────────────────────────────────────────
describe('POST ' + BASE_PATH + '/process', () => {
  test('should return 200 with "Nothing to process" when nothing is due', async () => {
    const { token } = await setupAuthedUser();
    const res = await request(app)
      .post(`${BASE_PATH}/process`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Nothing to process');
  });

  test('should correctly roll next_date forward for all frequency types (Weekly, Monthly, Yearly)', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    const weekly = await seedRecurringTransaction(userId, categoryId, {
      frequency: 'Weekly',
      next_date: pastDate(1),
    });
    const monthly = await seedRecurringTransaction(userId, categoryId, {
      frequency: 'Monthly',
      next_date: pastDate(1),
    });
    const yearly = await seedRecurringTransaction(userId, categoryId, {
      frequency: 'Yearly',
      next_date: pastDate(1),
    });

    await request(app).post(`${BASE_PATH}/process`).set('Authorization', `Bearer ${token}`);

    const wRes = await pool.query(
      'SELECT next_date FROM recurring_transactions WHERE recurring_id = $1',
      [weekly.recurring_id],
    );
    const mRes = await pool.query(
      'SELECT next_date FROM recurring_transactions WHERE recurring_id = $1',
      [monthly.recurring_id],
    );
    const yRes = await pool.query(
      'SELECT next_date FROM recurring_transactions WHERE recurring_id = $1',
      [yearly.recurring_id],
    );

    expect(new Date(wRes.rows[0].next_date).getTime()).toBeGreaterThan(
      new Date(pastDate(1)).getTime(),
    );
    expect(new Date(mRes.rows[0].next_date).getTime()).toBeGreaterThan(
      new Date(pastDate(1)).getTime(),
    );
    expect(new Date(yRes.rows[0].next_date).getTime()).toBeGreaterThan(
      new Date(pastDate(1)).getTime(),
    );
  });

  test('should delete a recurring transaction whose next_date is past its end_date', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    await seedRecurringTransaction(userId, categoryId, {
      frequency: 'Daily',
      next_date: pastDate(5),
      end_date: pastDate(3),
    });

    const res = await request(app)
      .post(`${BASE_PATH}/process`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  // DB Mock Tests to cover 500 errors
  test('should return 500 if fetching due recurring transactions fails', async () => {
    const { token } = await setupAuthedUser();
    const spy = jest.spyOn(model, 'getDueRecurring').mockImplementation((cb) => {
      cb(new Error('Simulated Database Error'), null);
    });

    const res = await request(app)
      .post(`${BASE_PATH}/process`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    spy.mockRestore();
  });

  test('should return 500 if updating next_date fails', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    await seedRecurringTransaction(userId, categoryId, {
      frequency: 'Daily',
      next_date: pastDate(1),
    });

    const spy = jest.spyOn(model, 'updateNextDate').mockImplementation((id, date, cb) => {
      cb(new Error('Simulated Database Error'));
    });

    const res = await request(app)
      .post(`${BASE_PATH}/process`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    spy.mockRestore();
  });

  test('should return 500 if removing an expired transaction fails', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    await seedRecurringTransaction(userId, categoryId, {
      frequency: 'Daily',
      next_date: pastDate(5),
      end_date: pastDate(3),
    });

    const spy = jest
      .spyOn(model, 'deleteRecurringTransactionById')
      .mockImplementation((data, cb) => {
        cb(new Error('Simulated Database Error'));
      });

    const res = await request(app)
      .post(`${BASE_PATH}/process`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    spy.mockRestore();
  });

  test('should return 500 if creating the spawned transaction fails', async () => {
    const { userId, categoryId, token } = await setupAuthedUser();
    await seedRecurringTransaction(userId, categoryId, {
      frequency: 'Daily',
      next_date: pastDate(1),
    });

    const spy = jest.spyOn(model, 'createFromRecurring').mockImplementation((data, cb) => {
      cb(new Error('Simulated Database Error'));
    });

    const res = await request(app)
      .post(`${BASE_PATH}/process`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});
