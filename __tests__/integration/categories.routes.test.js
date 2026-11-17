const request = require('supertest');
const app = require('../../src/app'); // Adjust path to your app.js if necessary
const pool = require('../../src/services/db');

beforeEach(async () => {
  // Clear categories table before each test to maintain a clean state
  await pool.query('DELETE FROM categories');
});

afterAll(async () => {
  await pool.query('DELETE FROM categories');
  await pool.end();
});

// ─────────────────────────────────────────────────────────
// GET /api/categories
// ─────────────────────────────────────────────────────────
describe('GET /api/categories', () => {
  test('should return 200 and an empty array when no categories exist', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    // Depending on whether model.selectAll returns rows directly or the query result object,
    // adjust this to match controller output (controller returns `results`, which is query result object or rows).
    // Based on categoriesController.js: return res.status(200).json(results); -> results.rows
    expect(res.body.rows || res.body).toEqual([]);
  });

  test('should return 200 and a list of categories when they exist', async () => {
    await pool.query(
      `INSERT INTO categories (category_name, category_type) VALUES ('Food', 'Expenses'), ('Salary', 'Income')`,
    );

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    const categories = res.body.rows || res.body;
    expect(categories).toHaveLength(2);
    expect(categories[0].category_name).toBe('Food');
    expect(categories[1].category_name).toBe('Salary');
  });
});

// ─────────────────────────────────────────────────────────
// GET /api/categories/:category_id
// ─────────────────────────────────────────────────────────
describe('GET /api/categories/:category_id', () => {
  test('should return 404 if category does not exist', async () => {
    const res = await request(app).get('/api/categories/9999');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Category not found');
  });

  test('should return 200 and the category details if it exists', async () => {
    const insertRes = await pool.query(
      `INSERT INTO categories (category_name, category_type) VALUES ('Transport', 'Expenses') RETURNING category_id`,
    );
    const categoryId = insertRes.rows[0].category_id;

    const res = await request(app).get(`/api/categories/${categoryId}`);

    expect(res.status).toBe(200);
    expect(res.body.category_id).toBe(categoryId);
    expect(res.body.category_name).toBe('Transport');
    expect(res.body.category_type).toBe('Expenses');
  });
});

// ─────────────────────────────────────────────────────────
// POST /api/categories
// ─────────────────────────────────────────────────────────
describe('POST /api/categories', () => {
  test('should return 400 if category_name or category_type is missing', async () => {
    const res = await request(app).post('/api/categories').send({ category_name: 'Entertainment' }); // Missing category_type

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing required data.');
  });

  test('should return 201 and create the category successfully', async () => {
    const res = await request(app)
      .post('/api/categories')
      .send({ category_name: 'Utilities', category_type: 'Expenses' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('category_id');
    expect(res.body.category_name).toBe('Utilities');
    expect(res.body.category_type).toBe('Expenses');

    // Verify it exists in database
    const dbCheck = await pool.query('SELECT * FROM categories WHERE category_name = $1', [
      'Utilities',
    ]);
    expect(dbCheck.rows).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────
// PUT /api/categories/:category_id
// ─────────────────────────────────────────────────────────
describe('PUT /api/categories/:category_id', () => {
  test('should return 400 if required fields are missing on update', async () => {
    const res = await request(app).put('/api/categories/1').send({ category_name: 'Updated Name' }); // Missing category_type

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Missing required fields');
  });

  test('should return 404 if category to update does not exist', async () => {
    const res = await request(app)
      .put('/api/categories/9999')
      .send({ category_name: 'Nonexistent', category_type: 'Expenses' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Category not found');
  });

  test('should return 200 and update the category successfully', async () => {
    const insertRes = await pool.query(
      `INSERT INTO categories (category_name, category_type) VALUES ('Old Name', 'Expenses') RETURNING category_id`,
    );
    const categoryId = insertRes.rows[0].category_id;

    const res = await request(app)
      .put(`/api/categories/${categoryId}`)
      .send({ category_name: 'New Name', category_type: 'Income' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Category updated successfully');

    // Verify update in database
    const dbCheck = await pool.query('SELECT * FROM categories WHERE category_id = $1', [
      categoryId,
    ]);
    expect(dbCheck.rows[0].category_name).toBe('New Name');
    expect(dbCheck.rows[0].category_type).toBe('Income');
  });
});

// ─────────────────────────────────────────────────────────
// DELETE /api/categories/:category_id
// ─────────────────────────────────────────────────────────
describe('DELETE /api/categories/:category_id', () => {
  test('should return 404 if category to delete does not exist', async () => {
    const res = await request(app).delete('/api/categories/9999');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Category not found');
  });

  test('should return 204 and delete the category successfully', async () => {
    const insertRes = await pool.query(
      `INSERT INTO categories (category_name, category_type) VALUES ('To Delete', 'Expenses') RETURNING category_id`,
    );
    const categoryId = insertRes.rows[0].category_id;

    const res = await request(app).delete(`/api/categories/${categoryId}`);

    expect(res.status).toBe(204);

    // Verify deletion in database
    const dbCheck = await pool.query('SELECT * FROM categories WHERE category_id = $1', [
      categoryId,
    ]);
    expect(dbCheck.rows).toHaveLength(0);
  });
});
