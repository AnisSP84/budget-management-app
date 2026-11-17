const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/services/db');

let token = '';
let categoryId = null;

beforeEach(async () => {
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM budgets');
  await pool.query('DELETE FROM transactions');
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users');

  // Register test user
  const regRes = await request(app).post('/api/auth/register').send({
    username: 'txtestuser',
    email: 'txtest@example.com',
    password: 'Password123!',
    captchaInput: '1234',
    captchaAnswer: '1234',
  });

  token = regRes.body.token;

  // Insert unique category dynamically to prevent primary/unique key errors
  const catRes = await pool.query(
    `INSERT INTO categories (category_name, category_type) 
     VALUES ($1, 'Expenses') RETURNING category_id`,
    [`Tx Test Cat ${Date.now()}`],
  );
  categoryId = catRes.rows[0].category_id;
});

afterAll(async () => {
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM budgets');
  await pool.query('DELETE FROM transactions');
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users');
  await pool.end();
});

describe('POST /api/transactions', () => {
  test('should return 401 if unauthenticated', async () => {
    const res = await request(app).post('/api/transactions').send({
      amount: 50,
      category_id: categoryId,
      transaction_date: '2026-08-01',
    });

    expect([401, 403]).toContain(res.status);
  });

  test('should create a transaction successfully', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 85.5,
        category_id: categoryId,
        transaction_date: '2026-08-05',
        description: 'Dinner with friends',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('transaction_id');
  });
});

describe('GET /api/transactions', () => {
  test('should return 200 and list of user transactions', async () => {
    const res = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('PUT /api/transactions/:id', () => {
  test('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .put('/api/transactions/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Incomplete update' }); // missing amount, category_id

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing required data.');
  });

  test('should return 404 if transaction does not exist for the user', async () => {
    const res = await request(app)
      .put('/api/transactions/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Ghost transaction',
        amount: 100,
        category_id: categoryId,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Transaction not found.');
  });

  test('should update a transaction successfully (204)', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 20,
        category_id: categoryId,
        transaction_date: '2026-08-02',
        description: 'Original description',
      });

    const transactionId = createRes.body.transaction_id;

    const res = await request(app)
      .put(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Updated description',
        amount: 40,
        category_id: categoryId,
      });

    expect(res.status).toBe(204);

    const dbCheck = await pool.query(
      'SELECT description, amount FROM transactions WHERE transaction_id = $1',
      [transactionId],
    );
    expect(dbCheck.rows[0].description).toBe('Updated description');
    expect(Number(dbCheck.rows[0].amount)).toBe(40);
  });
});

describe('DELETE /api/transactions/:id', () => {
  test('should return 404 if transaction does not exist for the user', async () => {
    const res = await request(app)
      .delete('/api/transactions/999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Transaction not found.');
  });

  test('should delete a transaction successfully (204)', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 15,
        category_id: categoryId,
        transaction_date: '2026-08-03',
        description: 'To be deleted',
      });

    const transactionId = createRes.body.transaction_id;

    const res = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const dbCheck = await pool.query('SELECT * FROM transactions WHERE transaction_id = $1', [
      transactionId,
    ]);
    expect(dbCheck.rows).toHaveLength(0);
  });
});

describe('DELETE /api/transactions/bulk', () => {
  test('should return 400 if ids is missing', async () => {
    const res = await request(app)
      .delete('/api/transactions/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('An array of transaction IDs is required.');
  });

  test('should return 400 if ids is an empty array', async () => {
    const res = await request(app)
      .delete('/api/transactions/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('An array of transaction IDs is required.');
  });

  test('should bulk delete transactions successfully (200)', async () => {
    const createRes1 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 10,
        category_id: categoryId,
        transaction_date: '2026-08-04',
        description: 'Bulk delete 1',
      });

    const createRes2 = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 25,
        category_id: categoryId,
        transaction_date: '2026-08-04',
        description: 'Bulk delete 2',
      });

    const ids = [createRes1.body.transaction_id, createRes2.body.transaction_id];

    const res = await request(app)
      .delete('/api/transactions/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Transactions deleted successfully.');
    expect(res.body.deletedCount).toBe(2);

    const dbCheck = await pool.query(
      'SELECT * FROM transactions WHERE transaction_id = ANY($1::int[])',
      [ids],
    );
    expect(dbCheck.rows).toHaveLength(0);
  });
});
