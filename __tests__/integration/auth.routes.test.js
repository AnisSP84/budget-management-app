const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const pool = require('../../src/services/db');

beforeEach(async () => {
  // Clean slate for every test. Order matters due to foreign key constraints.
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users');
  await pool.end();
});

// ── Helpers ──────────────────────────────────────────────

// Registers a user through the real endpoint so the password is hashed
// with bcrypt+pepper exactly the way production traffic would hash it,
// and a real refresh token row is written to the db.
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

// Pulls just the "name=value" pair out of a Set-Cookie header string,
// stripping the Path/HttpOnly/Secure/SameSite attributes so it can be
// replayed as a request Cookie header.
function extractCookiePair(setCookieHeaderArray, cookieName) {
  const raw = setCookieHeaderArray.find((c) => c.startsWith(`${cookieName}=`));
  return raw ? raw.split(';')[0] : undefined;
}

// Crafts a JWT signed with the app's real secret/algorithm but with an
// expiry in the past, so we can exercise the "expired access token"
// branch of /refresh without needing to wait out the real expiry window.
function generateExpiredAccessToken(userId) {
  return jwt.sign({ userId, timestamp: new Date() }, process.env.JWT_SECRET_KEY, {
    algorithm: process.env.JWT_ALGORITHM,
    expiresIn: '-10s',
  });
}

// ─────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  // Invalid partition: incorrect captcha fails validation early
  test('should return 400 for incorrect captcha', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'Password123!',
      captchaInput: '0000',
      captchaAnswer: '1234',
    });

    expect(res.status).toBe(400);
    expect(res.body).toBe('Incorrect captcha. Please try again.');
  });

  // Invalid partition: missing username (email + password present)
  test('should return 400 when username is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'missing@example.com',
      password: 'Password123!',
      captchaInput: '1234',
      captchaAnswer: '1234',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/doesn't exist/);
  });

  // Invalid partition: missing email (username + password present)
  test('should return 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'missingemail',
      password: 'Password123!',
      captchaInput: '1234',
      captchaAnswer: '1234',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/doesn't exist/);
  });

  // Invalid partition: missing password (username + email present)
  test('should return 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'missingpassword',
      email: 'missingpassword@example.com',
      captchaInput: '1234',
      captchaAnswer: '1234',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/doesn't exist/);
  });

  // Documents current behavior: VerifyCaptcha only checks that
  // captchaInput === captchaAnswer from the request body — it never
  // compares against a server-issued value. Any matching arbitrary
  // pair passes.
  test('should accept any captchaInput/captchaAnswer pair as long as they match each other', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'captchaquirk',
      email: 'captchaquirk@example.com',
      password: 'Password123!',
      captchaInput: 'not-a-real-captcha',
      captchaAnswer: 'not-a-real-captcha',
    });

    expect(res.status).toBe(200);
  });

  // Documents current behavior: if captchaInput/captchaAnswer are both
  // omitted, undefined === undefined is true, so VerifyCaptcha passes
  // and captcha validation is silently bypassed.
  test('should bypass captcha validation entirely when both captcha fields are omitted', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'nocaptcha',
      email: 'nocaptcha@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  // Valid partition: correct fields create user and return JWT + refresh cookie
  test('should return 200, a JWT token, and set a refresh token cookie on successful registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'validuser',
      email: 'validuser@example.com',
      password: 'Password123!',
      captchaInput: '1234',
      captchaAnswer: '1234',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((cookie) => cookie.includes('refreshToken='))).toBe(true);
  });

  // Boundary: existing username, different email
  test('should return 409 if username already exists', async () => {
    await seedUser(); // seeds 'testuser' / 'testuser@example.com'

    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'different@example.com',
      password: 'Password123!',
      captchaInput: '1234',
      captchaAnswer: '1234',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Username or email already exists');
  });

  // Boundary: existing email, different username
  test('should return 409 if email already exists', async () => {
    await seedUser(); // seeds 'testuser' / 'testuser@example.com'

    const res = await request(app).post('/api/auth/register').send({
      username: 'differentusername',
      email: 'testuser@example.com',
      password: 'Password123!',
      captchaInput: '1234',
      captchaAnswer: '1234',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Username or email already exists');
  });
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  // Invalid partition: missing password (username present)
  test('should return 400 when password is not provided', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'testuser',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/doesn't exist/);
  });

  // Invalid partition: missing username (password present)
  test('should return 400 when username is not provided', async () => {
    const res = await request(app).post('/api/auth/login').send({
      password: 'Password123!',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/doesn't exist/);
  });

  // Invalid partition: user does not exist
  test('should return 404 when user is not found', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'ghostuser',
      password: 'Password123!',
    });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  // Invalid partition: wrong password
  test('should return 401 for incorrect password', async () => {
    await seedUser();

    const res = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Wrong password');
  });

  // Valid partition: correct credentials
  test('should return 200, a JWT token, and set a refresh token cookie', async () => {
    await seedUser();

    const res = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((cookie) => cookie.includes('refreshToken='))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  // Invalid partition: no tokens provided at all
  test('should return 401 if no authorization header is provided', async () => {
    const res = await request(app).post('/api/auth/refresh').send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  // Boundary: token provided is still valid (not expired)
  test('should return 204 if the provided JWT token is still valid and not expired', async () => {
    const loginRes = await seedUser();
    const validToken = loginRes.body.token;

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${validToken}`);

    // verifyExpiredToken middleware returns 204 if the token verifies without error
    expect(res.status).toBe(204);
  });

  // Invalid partition: access token expired, no refresh token cookie sent at all
  test('should return 401 if the access token is expired and no refresh cookie is present', async () => {
    const seedRes = await seedUser();
    const userId = seedRes.body.userId; // may be undefined; not required for this path
    const expiredToken = generateExpiredAccessToken(userId);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No refresh token provided');
  });

  // Invalid partition: access token expired, refresh cookie present but tampered
  // (signature check fails, so cookie-parser drops it from signedCookies)
  test('should return 401 if the refresh token cookie signature is invalid', async () => {
    const seedRes = await seedUser();
    const cookies = seedRes.headers['set-cookie'];
    const validCookiePair = extractCookiePair(cookies, 'refreshToken');
    const tamperedCookiePair = `${validCookiePair}tampered`;

    const expiredToken = generateExpiredAccessToken();

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Cookie', tamperedCookiePair);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No refresh token provided');
  });

  // Invalid partition: access token expired, refresh cookie valid, but the
  // corresponding row has been removed from refresh_tokens
  test('should return 401 if the refresh token is not found in the database', async () => {
    const seedRes = await seedUser();
    const cookiePair = extractCookiePair(seedRes.headers['set-cookie'], 'refreshToken');
    const expiredToken = generateExpiredAccessToken();

    // Simulate the token having been revoked / never persisted
    await pool.query('DELETE FROM refresh_tokens');

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Cookie', cookiePair);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Refresh token not found');
  });

  // Boundary: access token expired, refresh token found in db, but its own
  // expires_at is in the past
  test('should return 401 if the refresh token itself has expired', async () => {
    const seedRes = await seedUser();
    const cookiePair = extractCookiePair(seedRes.headers['set-cookie'], 'refreshToken');
    const expiredToken = generateExpiredAccessToken();

    // NOTE: the cookie value is the *signed* (s:<jwt>.<hmac>, URL-encoded)
    // representation, not the plain JWT stored in refresh_tokens.token, so
    // we can't WHERE-match on it directly. beforeEach wipes the table and
    // seedUser() inserts exactly one row, so updating unconditionally is
    // safe and unambiguous here.
    await pool.query(`UPDATE refresh_tokens SET expires_at = $1`, [new Date(Date.now() - 1000)]);

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Cookie', cookiePair);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Refresh token expired');
  });

  // Valid partition: access token expired, refresh token valid and unexpired
  // -> a new access token is issued
  test('should return 200 and a new token when the access token is expired but the refresh token is valid', async () => {
    const seedRes = await seedUser();
    const cookiePair = extractCookiePair(seedRes.headers['set-cookie'], 'refreshToken');
    const expiredToken = generateExpiredAccessToken();

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Cookie', cookiePair);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.token).not.toBe(expiredToken);
  });

  // Valid partition: a successful refresh should not rotate the refresh
  // cookie — the /refresh chain never calls issueRefreshToken
  test('should not set a new refresh token cookie on a successful refresh', async () => {
    const seedRes = await seedUser();
    const cookiePair = extractCookiePair(seedRes.headers['set-cookie'], 'refreshToken');
    const expiredToken = generateExpiredAccessToken();

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${expiredToken}`)
      .set('Cookie', cookiePair);

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────
// 404 handling
// ─────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  // Invalid partition: GET to a non-existent route
  test('GET /unknown should return 404', async () => {
    const res = await request(app).get('/unknown');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/Unknown resource/);
  });

  // Invalid partition: POST to a non-existent route
  test('POST /unknown should return 404', async () => {
    const res = await request(app).post('/unknown').send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Unknown resource/);
  });

  // Invalid partition: correct auth path, wrong HTTP method
  test('GET /api/auth/login should return 404 (route only accepts POST)', async () => {
    const res = await request(app).get('/api/auth/login');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Unknown resource/);
  });
});
