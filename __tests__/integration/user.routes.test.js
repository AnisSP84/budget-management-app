const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const pool = require('../../src/services/db');

// ── DB Setup / Teardown ──────────────────────────────────
// Tables are created via the Jest globalSetup (configs/jest-integration-setup.js)
// which runs scripts/reset.js before any test file executes.

beforeEach(async () => {
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users');
  await pool.end();
});

// ── Helpers ──────────────────────────────────────────────

// Registers a real user through the auth endpoint so the access token in
// the response is a genuine, correctly-signed token for a real row in
// the users table.
async function seedUser(overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'Password123!',
      captchaInput: '1234',
      captchaAnswer: '1234',
      ...overrides,
    });
  return res;
}

async function getUserIdByUsername(username) {
  const result = await pool.query('SELECT user_id FROM users WHERE username = $1', [username]);
  return result.rows[0]?.user_id;
}

function generateToken(userId, options = {}) {
  return jwt.sign({ userId, timestamp: new Date() }, process.env.JWT_SECRET_KEY, {
    algorithm: process.env.JWT_ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN,
    ...options,
  });
}

function generateExpiredToken(userId) {
  return generateToken(userId, { expiresIn: '-10s' });
}

// ─────────────────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  // Invalid partition: no Authorization header at all
  test('should return 401 if no authorization header is provided', async () => {
    const res = await request(app).get('/api/users');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  // Invalid partition: Authorization header present but missing "Bearer " prefix
  test('should return 401 if the authorization header is malformed', async () => {
    const seedRes = await seedUser();

    const res = await request(app).get('/api/users').set('Authorization', seedRes.body.token); // no "Bearer " prefix

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  // Invalid partition: well-formed but garbage/invalid-signature token
  test('should return 401 for an invalid token', async () => {
    const badToken = jwt.sign({ userId: 1 }, 'not-the-real-secret', {
      algorithm: process.env.JWT_ALGORITHM,
      expiresIn: '1h',
    });

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${badToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });

  // Boundary: correctly-signed but expired token
  test('should return 401 for an expired token', async () => {
    // const seedRes = await seedUser();
    const userId = await getUserIdByUsername('testuser');
    const expiredToken = generateExpiredToken(userId);

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token expired');
  });

  // Boundary: JWT payload has userId 0. 0 is a legitimate id but is
  // falsy in JS, and userController.readUserById checks
  // `if (!res.locals.userId)`, so a real user with id 0 would be
  // incorrectly rejected as "not logged in". This documents that gap.
  test('BUG: should not treat a valid token with userId 0 as "not logged in"', async () => {
    const zeroIdToken = generateToken(0);

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${zeroIdToken}`);

    // Current (buggy) behavior. If user_id sequences in this schema can
    // never actually be 0, this may be low-priority; otherwise the
    // readUserById falsy-check should be `res.locals.userId == null`.
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Not logged in');
  });

  // Invalid partition: valid, unexpired token, but the user no longer
  // exists in the database (e.g. deleted after the token was issued)
  test('should return 404 if the user no longer exists', async () => {
    const seedRes = await seedUser();
    const userId = await getUserIdByUsername('testuser');
    const validToken = seedRes.body.token;

    await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  // Valid partition: valid token for an existing user
  test('should return 200 and the user details for a valid token', async () => {
    const seedRes = await seedUser();
    const validToken = seedRes.body.token;

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('testuser');
    expect(res.body.email).toBe('testuser@example.com');
    expect(res.body).toHaveProperty('user_id');
  });

  // Security concern, documented rather than silently allowed to regress
  // further: readUserById spreads the full users row (`...results.rows[0]`)
  // into the response, which includes the bcrypt password hash.
  test('SECURITY: current response includes the hashed password field', async () => {
    const seedRes = await seedUser();
    const validToken = seedRes.body.token;

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    // This assertion documents current (undesirable) behavior. The route
    // should select/return an explicit allow-list of columns instead of
    // spreading the raw row, so the password hash is never serialized.
    expect(res.body).toHaveProperty('password');
  });

  // Invalid partition: correct path, unsupported method
  test('POST /api/users should return 404 (route only accepts GET)', async () => {
    const res = await request(app).post('/api/users').send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Unknown resource/);
  });
});
