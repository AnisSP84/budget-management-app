const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const saltRounds = 10;

require('dotenv').config();

const pepper = process.env.BCRYPT_PEPPER;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ─────────────────────────────
// SEED DATA
// ─────────────────────────────

const users = [
  {
    username: 'alice',
    email: 'alice@example.com',
    password: 'hashed_pw_1',
    name: 'Alice',
    dob: '2008-01-01',
    occupation: 'unemployed',
    created_at: '2023-01-01',
  },
  {
    username: 'bob',
    email: 'bob@example.com',
    password: 'hashed_pw_2',
    name: 'Bob',
    dob: '2008-01-02',
    occupation: 'unemployed',
    created_at: '2023-01-01',
  },
  {
    username: 'carol',
    email: 'carol@example.com',
    password: 'hashed_pw_3',
    name: 'Carol',
    dob: '2008-01-03',
    occupation: 'unemployed',
    created_at: '2023-01-01',
  },
  {
    username: 'dave',
    email: 'dave@example.com',
    password: 'hashed_pw_4',
    name: 'Dave',
    dob: '2008-01-04',
    occupation: 'unemployed',
    created_at: '2023-01-01',
  },
  {
    username: 'eve',
    email: 'eve@example.com',
    password: 'hashed_pw_5',
    name: 'Eve',
    dob: '2008-01-05',
    occupation: 'unemployed',
    created_at: '2023-01-01',
  },
  {
    username: 'testuser',
    email: 'testuser@example.com',
    password: '1234',
    name: 'Testuser',
    dob: '2008-01-06',
    occupation: 'unemployed',
    created_at: '2023-01-01',
  },
];

const categories = [
  { category_name: 'Food', category_type: 'Expenses' },
  { category_name: 'Transport', category_type: 'Expenses' },
  { category_name: 'Salary', category_type: 'Income' },
  { category_name: 'Freelance', category_type: 'Income' },
];

const transactions = [
  {
    user_id: 1,
    category_id: 1,
    amount: 25.5,
    description: 'Lunch',
    transaction_date: '2026-05-01 12:30:00',
  },
  {
    user_id: 1,
    category_id: 3,
    amount: 3000.0,
    description: 'Salary',
    transaction_date: '2026-05-01 09:00:00',
  },
  {
    user_id: 2,
    category_id: 2,
    amount: 15.0,
    description: 'Taxi',
    transaction_date: '2026-05-02 18:10:00',
  },
];

const budgets = [
  { user_id: 1, category_id: 1, amount: 400, description: 'Food budget' },
  { user_id: 1, category_id: 2, amount: 150, description: 'Transport budget' },
];

const notifications = [
  { user_id: 1, message: 'Close to food budget', type: 'WARNING', title: 'abc' },
  { user_id: 2, message: 'Transport spending high', type: 'WARNING', title: 'abc' },
];

const countries = [
  ['SG', 'Singapore', 'SGD'],
  ['MY', 'Malaysia', 'MYR'],
  ['CN', 'China', 'CNY'],
  ['ID', 'Indonesia', 'IDR'],
  ['KR', 'South Korea', 'KRW'],
  ['JP', 'Japan', 'JPY'],
  ['TH', 'Thailand', 'THB'],
  ['VN', 'Vietnam', 'VND'],
  ['PH', 'Philippines', 'PHP'],
  ['HK', 'Hong Kong', 'HKD'],
];

// ─────────────────────────────
// HELPERS
// ─────────────────────────────
async function insertUsers() {
  if (!users.length) return new Map();

  const values = [];
  const placeholders = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    const hashedPassword = await bcrypt.hash(user.password + pepper, saltRounds);

    values.push(user.username, user.email, hashedPassword);

    placeholders.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
  }

  const result = await pool.query(
    `INSERT INTO users (username, email, password)
     VALUES ${placeholders.join(', ')}
     RETURNING user_id`,
    values,
  );

  const map = new Map();

  result.rows.forEach((row, idx) => {
    map.set(idx + 1, row.user_id);
  });

  return map;
}

async function insertCategories() {
  if (!categories.length) return new Map();

  const values = [];
  const placeholders = categories.map((c, i) => {
    values.push(c.category_name, c.category_type);
    return `($${i * 2 + 1}, $${i * 2 + 2})`;
  });

  const result = await pool.query(
    `INSERT INTO categories (category_name, category_type)
     VALUES ${placeholders.join(', ')}
     RETURNING category_id`,
    values,
  );

  const map = new Map();
  result.rows.forEach((row, idx) => {
    map.set(idx + 1, row.category_id);
  });

  return map;
}

async function seed() {
  try {
    console.log('Seeding started...');

    await pool.query('BEGIN');

    // COUNTRIES - MUST BE FIRST due to foreign key constraint on user_settings
    if (countries.length) {
      const values = countries.flat();
      const placeholders = countries
        .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
        .join(', ');

      await pool.query(
        `INSERT INTO countries (code, name, currency_code)
         VALUES ${placeholders}
         ON CONFLICT (code) DO NOTHING`,
        values,
      );
    }

    console.log(`Inserted ${countries.length} countries`);

    // USERS - Now countries exist, so trigger won't fail
    const userMap = await insertUsers();
    console.log(`Inserted ${users.length} users`);

    // CATEGORIES
    const categoryMap = await insertCategories();
    console.log(`Inserted ${categories.length} categories`);

    // TRANSACTIONS
    if (transactions.length) {
      const values = [];
      const placeholders = transactions.map((t, i) => {
        values.push(
          userMap.get(t.user_id),
          categoryMap.get(t.category_id),
          t.amount,
          t.description,
          t.transaction_date,
        );
        return `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`;
      });

      await pool.query(
        `INSERT INTO transactions (user_id, category_id, amount, description, transaction_date)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    console.log(`Inserted ${transactions.length} transactions`);

    // BUDGETS
    if (budgets.length) {
      const values = [];
      const placeholders = budgets.map((b, i) => {
        values.push(
          userMap.get(b.user_id),
          categoryMap.get(b.category_id),
          b.amount,
          b.description,
        );
        return `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`;
      });

      await pool.query(
        `INSERT INTO budgets (user_id, category_id, amount, description)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    console.log(`Inserted ${budgets.length} budgets`);

    // NOTIFICATIONS
    if (notifications.length) {
      const values = [];
      const placeholders = notifications.map((n, i) => {
        values.push(userMap.get(n.user_id), n.message, n.type, n.title);

        return `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`;
      });

      await pool.query(
        `INSERT INTO notifications (user_id, message, type, title)
     VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    console.log(`Inserted ${notifications.length} notifications`);

    await pool.query('COMMIT');

    console.log('Seeding completed successfully');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Seeding failed:', err);
  } finally {
    await pool.end();
    console.log('DB connection closed');
  }
}

seed();
