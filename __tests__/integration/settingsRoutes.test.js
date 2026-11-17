const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../../src/app');
const pool = require('../../src/services/db');
const SettingsModel = require('../../src/models/settingsModel');
const SettingsController = require('../../src/controllers/settingsController');

const testUserId = 6;
const pepper = process.env.BCRYPT_PEPPER;

function authToken() {
  return jwt.sign({ userId: testUserId }, process.env.JWT_SECRET_KEY, {
    algorithm: process.env.JWT_ALGORITHM,
    expiresIn: '1h',
  });
}

function authenticated(requestBuilder) {
  return requestBuilder.set('Authorization', `Bearer ${authToken()}`);
}

beforeEach(async () => {
  // Recreate the fixture because unrelated integration suites remove users.
  const originalPassword = await bcrypt.hash(`1234${pepper}`, 10);

  await pool.query(
    `INSERT INTO users (user_id, username, email, password, name, dob, occupation)
     VALUES ($1, $2, $3, $4, NULL, NULL, NULL)
     ON CONFLICT (user_id)
     DO UPDATE SET
       username = EXCLUDED.username,
       email = EXCLUDED.email,
       password = EXCLUDED.password,
       name = NULL,
       dob = NULL,
       occupation = NULL`,
    [testUserId, 'testuser', 'testuser@example.com', originalPassword],
  );
  await pool.query(
    `INSERT INTO user_settings (user_id, dark_mode, country_code, budget_notification, warning_threshold)
     VALUES ($1, false, 'SG', true, 80)
     ON CONFLICT (user_id)
     DO UPDATE SET
       dark_mode = EXCLUDED.dark_mode,
       country_code = EXCLUDED.country_code,
       budget_notification = EXCLUDED.budget_notification,
       warning_threshold = EXCLUDED.warning_threshold`,
    [testUserId],
  );
});

afterAll(async () => {
  await pool.end();
});

describe('settings routes', () => {
  test('GET /api/settings/all rejects a request without a JWT', async () => {
    const response = await request(app).get('/api/settings/all');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'No token provided' });
  });

  test('GET /api/settings/all returns the authenticated user and preferences', async () => {
    const response = await authenticated(request(app).get('/api/settings/all'));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        user_id: testUserId,
        username: 'testuser',
        email: 'testuser@example.com',
        country_code: 'SG',
        dark_mode: false,
        budget_notification: true,
        warning_threshold: 80,
      }),
    );
  });

  test('GET /api/settings/:userId returns the user preference record', async () => {
    const response = await authenticated(request(app).get(`/api/settings/${testUserId}`));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ user_id: testUserId, country_code: 'SG' }),
      }),
    );
  });

  test('GET /api/settings/:userId uses the authenticated user instead of the path value', async () => {
    const response = await authenticated(request(app).get('/api/settings/999999'));

    expect(response.status).toBe(200);
    expect(response.body.data.user_id).toBe(testUserId);
  });

  test('PATCH /api/settings/profile hashes and persists a new password', async () => {
    const newPassword = 'IntegrationPassword123!';
    const response = await authenticated(request(app).patch('/api/settings/profile')).send({
      password: newPassword,
      name: 'Integration Test User',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Profile updated successfully',
    });

    const result = await pool.query('SELECT password, name FROM users WHERE user_id = $1', [
      testUserId,
    ]);
    expect(result.rows[0].name).toBe('Integration Test User');
    await expect(bcrypt.compare(`${newPassword}${pepper}`, result.rows[0].password)).resolves.toBe(
      true,
    );
  });

  test('PATCH /api/settings/profile rejects an invalid email address', async () => {
    const response = await authenticated(request(app).patch('/api/settings/profile')).send({
      email: 'not-an-email',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: 'Invalid email address. Email must contain @ symbol',
    });
  });

  test('PATCH /api/settings/profile persists every supported profile field', async () => {
    const response = await authenticated(request(app).patch('/api/settings/profile')).send({
      username: 'integration-user',
      email: 'integration@example.com',
      name: 'Integration User',
      dob: '2000-01-02',
      occupation: 'Tester',
    });

    expect(response.status).toBe(200);
    const result = await pool.query(
      'SELECT username, email, name, dob, occupation FROM users WHERE user_id = $1',
      [testUserId],
    );
    expect(result.rows[0]).toEqual({
      username: 'integration-user',
      email: 'integration@example.com',
      name: 'Integration User',
      dob: '2000-01-02',
      occupation: 'Tester',
    });
  });

  test('PATCH /api/settings/profile supports a partial profile update', async () => {
    const response = await authenticated(request(app).patch('/api/settings/profile')).send({
      username: 'partial-profile-user',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Profile updated successfully' });
  });

  test('PATCH /api/settings/preferences persists preference changes', async () => {
    const response = await authenticated(request(app).patch('/api/settings/preferences')).send({
      darkMode: true,
      countryCode: 'JP',
      budgetNotification: false,
      warningThreshold: 50,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Preferences updated successfully',
        data: expect.objectContaining({
          dark_mode: true,
          country_code: 'JP',
          budget_notification: false,
          warning_threshold: 50,
        }),
      }),
    );

    const result = await pool.query(
      'SELECT dark_mode, country_code, budget_notification, warning_threshold FROM user_settings WHERE user_id = $1',
      [testUserId],
    );
    expect(result.rows[0]).toEqual({
      dark_mode: true,
      country_code: 'JP',
      budget_notification: false,
      warning_threshold: 50,
    });
  });

  test('PATCH /api/settings/preferences returns 404 when no preferences are supplied', async () => {
    const response = await authenticated(request(app).patch('/api/settings/preferences')).send({});

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'No updates provided or settings not found',
    });
  });

  test('PATCH /api/settings/preferences supports a partial preference update', async () => {
    const response = await authenticated(request(app).patch('/api/settings/preferences')).send({
      countryCode: 'MY',
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        country_code: 'MY',
        exchangeRate: 3.48,
      }),
    );
  });

  test('POST /api/settings/initSettings creates or updates settings for the authenticated user', async () => {
    const response = await authenticated(request(app).post('/api/settings/initSettings')).send({
      country: 'MY',
      dark_mode: true,
      budgetNotification: false,
      warningThreshold: 65,
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Successfully Initialized Settings');

    const result = await pool.query(
      'SELECT country_code, dark_mode, budget_notification, warning_threshold FROM user_settings WHERE user_id = $1',
      [testUserId],
    );
    expect(result.rows[0]).toEqual({
      country_code: 'MY',
      dark_mode: true,
      budget_notification: false,
      warning_threshold: 65,
    });
  });

  test('POST /api/settings/initSettings applies the default preference values', async () => {
    const response = await authenticated(request(app).post('/api/settings/initSettings')).send({
      country: 'SG',
    });

    expect(response.status).toBe(201);
    const result = await pool.query(
      'SELECT dark_mode, budget_notification, warning_threshold FROM user_settings WHERE user_id = $1',
      [testUserId],
    );
    expect(result.rows[0]).toEqual({
      dark_mode: false,
      budget_notification: true,
      warning_threshold: 80,
    });
  });

  test('GET /api/settings/countries returns the seeded country list without authentication', async () => {
    const response = await request(app).get('/api/settings/countries');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Successfully Queried Countries');
    expect(response.body.result).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'SG', name: 'Singapore' })]),
    );
  });

  test('GET /api/settings/currency/data returns the supported currencies and exchange rates', async () => {
    const response = await request(app).get('/api/settings/currency/data');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          currencies: expect.objectContaining({ SG: expect.any(Object) }),
          exchangeRates: expect.objectContaining({ SG: 1 }),
        }),
      }),
    );
  });

  test('DELETE /api/settings/:userId deletes the settings record and then reports it missing', async () => {
    const deleted = await authenticated(request(app).delete(`/api/settings/${testUserId}`));
    const getMissing = await authenticated(request(app).get(`/api/settings/${testUserId}`));
    const missing = await authenticated(request(app).delete(`/api/settings/${testUserId}`));

    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ success: true, message: 'Settings deleted successfully' });
    expect(getMissing.status).toBe(404);
    expect(getMissing.body).toEqual({
      success: false,
      message: 'Settings not found for this user',
    });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ success: false, message: 'Settings not found' });
  });

  test('controller fallbacks return 404 when settings cannot be found', async () => {
    const getUserSettings = jest
      .spyOn(SettingsModel, 'getUserSettings')
      .mockResolvedValueOnce(null);
    const getAllUserSettings = jest
      .spyOn(SettingsModel, 'getAllUserSettings')
      .mockResolvedValueOnce(null);
    const res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await SettingsController.getSettings({ params: { userId: '999999' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    res.status.mockClear();
    res.json.mockClear();
    res.locals.userId = 999999;
    await SettingsController.getAllSettings({}, res);
    expect(res.status).toHaveBeenCalledWith(404);

    getUserSettings.mockRestore();
    getAllUserSettings.mockRestore();
  });

  test('settings model returns null for a user without a settings record', async () => {
    await expect(SettingsModel.getAllUserSettings(999999)).resolves.toBeNull();
    await expect(SettingsModel.getUserSettings(999999)).resolves.toBeNull();
  });

  test.each([
    ['GET /all', 'getAllUserSettings', () => authenticated(request(app).get('/api/settings/all'))],
    [
      'GET /:userId',
      'getUserSettings',
      () => authenticated(request(app).get(`/api/settings/${testUserId}`)),
    ],
    [
      'PATCH /profile',
      'updateUserProfile',
      () =>
        authenticated(request(app).patch('/api/settings/profile')).send({ username: 'failure' }),
    ],
    [
      'PATCH /preferences',
      'updateUserPreferences',
      () => authenticated(request(app).patch('/api/settings/preferences')).send({ darkMode: true }),
    ],
    [
      'DELETE /:userId',
      'deleteUserSettings',
      () => authenticated(request(app).delete(`/api/settings/${testUserId}`)),
    ],
  ])('%s returns 500 when %s fails', async (route, modelMethod, send) => {
    const modelSpy = jest
      .spyOn(SettingsModel, modelMethod)
      .mockRejectedValueOnce(new Error('Database unavailable'));

    const response = await send();

    expect(response.status).toBe(500);
    modelSpy.mockRestore();
  });

  test('settings callbacks return 500 when their model operations fail', () => {
    const createSettings = jest
      .spyOn(SettingsModel, 'createUserSettingsCountry')
      .mockImplementationOnce((data, callback) => callback(new Error('Database unavailable')));
    const queryCountries = jest
      .spyOn(SettingsModel, 'queryCountries')
      .mockImplementationOnce((callback) => callback(new Error('Database unavailable')));
    const next = jest.fn();
    const res = {
      locals: { userId: testUserId },
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    SettingsController.createUserSettingsCountry({ body: { country: 'SG' } }, res, next);
    SettingsController.queryCountries({}, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();

    createSettings.mockRestore();
    queryCountries.mockRestore();
  });

  test('controller success, fallback, and currency-error paths return their expected responses', async () => {
    const res = {
      locals: { userId: testUserId },
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const getAllUserSettings = jest
      .spyOn(SettingsModel, 'getAllUserSettings')
      .mockResolvedValueOnce({ user_id: testUserId });

    await SettingsController.getAllSettings({}, res);
    expect(res.status).toHaveBeenCalledWith(200);
    getAllUserSettings.mockRestore();

    res.status.mockClear();
    res.json.mockClear();
    const updateUserPreferences = jest
      .spyOn(SettingsModel, 'updateUserPreferences')
      .mockResolvedValueOnce(null);
    await SettingsController.updatePreferences({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    updateUserPreferences.mockRestore();

    res.status.mockClear();
    res.json.mockClear();
    res.locals = { userId: testUserId };
    await SettingsController.updatePreferences({ body: { darkMode: true } }, res);
    expect(res.status).toHaveBeenCalledWith(200);

    res.status.mockClear();
    res.json.mockClear();
    res.locals = {};
    const deleteUserSettings = jest
      .spyOn(SettingsModel, 'deleteUserSettings')
      .mockResolvedValueOnce({ user_id: testUserId });
    await SettingsController.deleteSettings({ params: { userId: testUserId } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    deleteUserSettings.mockRestore();

    res.status.mockClear();
    res.json.mockReset();
    res.json.mockImplementationOnce(() => {
      throw new Error('Response unavailable');
    });
    await SettingsController.getCurrencyData({}, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('settings model handles successful, empty, and partial update query builders', async () => {
    await expect(SettingsModel.getAllUserSettings(testUserId)).resolves.toEqual(
      expect.objectContaining({ user_id: testUserId }),
    );
    await expect(SettingsModel.updateUserProfile(testUserId, {})).resolves.toBeNull();
    await expect(
      SettingsModel.updateUserPreferences(testUserId, { darkMode: true }),
    ).resolves.toEqual(expect.objectContaining({ dark_mode: true }));
    await expect(SettingsModel.updateUserPreferences(testUserId, {})).resolves.toBeNull();
  });
});
