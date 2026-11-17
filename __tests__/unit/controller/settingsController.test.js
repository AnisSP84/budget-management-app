jest.mock('../../../src/models/settingsModel');
jest.mock('bcrypt', () => ({ hash: jest.fn() }));

const previousPepper = process.env.BCRYPT_PEPPER;
process.env.BCRYPT_PEPPER = 'test-pepper';

const SettingsModel = require('../../../src/models/settingsModel');
const bcrypt = require('bcrypt');
const settingsController = require('../../../src/controllers/settingsController');

describe('SettingsController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    req = {
      body: {},
      params: {},
    };

    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (previousPepper === undefined) delete process.env.BCRYPT_PEPPER;
    else process.env.BCRYPT_PEPPER = previousPepper;
  });

  describe('getAllSettings', () => {
    test('should return 200 with settings merged with currency data', async () => {
      res.locals.userId = 1;
      const settings = { user_id: 1, username: 'jdoe', country_code: 'SG' };
      SettingsModel.getAllUserSettings.mockResolvedValueOnce(settings);

      await settingsController.getAllSettings(req, res);

      expect(SettingsModel.getAllUserSettings).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          user_id: 1,
          username: 'jdoe',
          currencyData: expect.any(Object),
          exchangeRates: expect.any(Object),
        }),
      });
    });

    test('should return 404 when no settings exist for the user', async () => {
      res.locals.userId = 1;
      SettingsModel.getAllUserSettings.mockResolvedValueOnce(null);

      await settingsController.getAllSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Settings not found for this user',
      });
    });

    test('should return 500 when the model throws', async () => {
      res.locals.userId = 1;
      const error = new Error('DB down');
      SettingsModel.getAllUserSettings.mockRejectedValueOnce(error);

      await settingsController.getAllSettings(req, res);

      expect(console.error).toHaveBeenCalledWith('Error fetching all settings:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch settings',
        error: 'DB down',
      });
    });
  });

  describe('getSettings', () => {
    test('should use res.locals.userId when present', async () => {
      res.locals.userId = 1;
      req.params.userId = 2;
      const settings = { user_id: 1, country_code: 'MY' };
      SettingsModel.getUserSettings.mockResolvedValueOnce(settings);

      await settingsController.getSettings(req, res);

      expect(SettingsModel.getUserSettings).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should fall back to req.params.userId when res.locals.userId is absent', async () => {
      req.params.userId = 2;
      const settings = { user_id: 2, country_code: 'JP' };
      SettingsModel.getUserSettings.mockResolvedValueOnce(settings);

      await settingsController.getSettings(req, res);

      expect(SettingsModel.getUserSettings).toHaveBeenCalledWith(2);
    });

    test('should return 404 when no settings exist for the user', async () => {
      res.locals.userId = 1;
      SettingsModel.getUserSettings.mockResolvedValueOnce(null);

      await settingsController.getSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Settings not found for this user',
      });
    });

    test('should return 500 when the model throws', async () => {
      res.locals.userId = 1;
      const error = new Error('DB down');
      SettingsModel.getUserSettings.mockRejectedValueOnce(error);

      await settingsController.getSettings(req, res);

      expect(console.error).toHaveBeenCalledWith('Error fetching settings:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch settings',
        error: 'DB down',
      });
    });
  });

  describe('updateProfile', () => {
    test('should return 400 for an invalid email (missing @)', async () => {
      res.locals.userId = 1;
      req.body = { email: 'not-an-email' };

      await settingsController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email address. Email must contain @ symbol',
      });
      expect(SettingsModel.updateUserProfile).not.toHaveBeenCalled();
    });

    test('should hash the password and include it in the update when provided', async () => {
      res.locals.userId = 1;
      req.body = { password: 'plaintext' };
      bcrypt.hash.mockResolvedValueOnce('hashed-value');
      SettingsModel.updateUserProfile.mockResolvedValueOnce({ user_id: 1 });

      await settingsController.updateProfile(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintexttest-pepper', 10);
      expect(SettingsModel.updateUserProfile).toHaveBeenCalledWith(1, {
        passwordHash: 'hashed-value',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
      });
    });

    test('should not hash or include a password when none is provided', async () => {
      res.locals.userId = 1;
      req.body = { username: 'newname' };
      SettingsModel.updateUserProfile.mockResolvedValueOnce({ user_id: 1 });

      await settingsController.updateProfile(req, res);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(SettingsModel.updateUserProfile).toHaveBeenCalledWith(1, { username: 'newname' });
    });

    test('should only include fields that were provided in req.body', async () => {
      res.locals.userId = 1;
      req.body = { name: 'Jane', occupation: 'Designer' };
      SettingsModel.updateUserProfile.mockResolvedValueOnce({ user_id: 1 });

      await settingsController.updateProfile(req, res);

      expect(SettingsModel.updateUserProfile).toHaveBeenCalledWith(1, {
        name: 'Jane',
        occupation: 'Designer',
      });
    });

    test('should include dob when provided', async () => {
      res.locals.userId = 1;
      req.body = { dob: '1990-01-01' };
      SettingsModel.updateUserProfile.mockResolvedValueOnce({ user_id: 1 });

      await settingsController.updateProfile(req, res);

      expect(SettingsModel.updateUserProfile).toHaveBeenCalledWith(1, { dob: '1990-01-01' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should accept a valid email and include it in the update', async () => {
      res.locals.userId = 1;
      req.body = { email: 'jane@example.com' };
      SettingsModel.updateUserProfile.mockResolvedValueOnce({ user_id: 1 });

      await settingsController.updateProfile(req, res);

      expect(SettingsModel.updateUserProfile).toHaveBeenCalledWith(1, {
        email: 'jane@example.com',
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 500 when hashing the password fails', async () => {
      res.locals.userId = 1;
      req.body = { password: 'plaintext' };
      const error = new Error('hash failure');
      bcrypt.hash.mockRejectedValueOnce(error);

      await settingsController.updateProfile(req, res);

      expect(console.error).toHaveBeenCalledWith('Error updating profile:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update profile',
        error: 'hash failure',
      });
    });

    test('should return 500 when the model throws', async () => {
      res.locals.userId = 1;
      req.body = { username: 'jdoe' };
      const error = new Error('DB down');
      SettingsModel.updateUserProfile.mockRejectedValueOnce(error);

      await settingsController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update profile',
        error: 'DB down',
      });
    });
  });

  describe('updatePreferences', () => {
    test('should only forward fields present in req.body', async () => {
      res.locals.userId = 1;
      req.body = { darkMode: true };
      SettingsModel.updateUserPreferences.mockResolvedValueOnce({ user_id: 1, dark_mode: true });

      await settingsController.updatePreferences(req, res);

      expect(SettingsModel.updateUserPreferences).toHaveBeenCalledWith(1, { darkMode: true });
    });

    test('should include budgetNotification when provided', async () => {
      res.locals.userId = 1;
      req.body = { budgetNotification: false };
      SettingsModel.updateUserPreferences.mockResolvedValueOnce({
        user_id: 1,
        budget_notification: false,
      });

      await settingsController.updatePreferences(req, res);

      expect(SettingsModel.updateUserPreferences).toHaveBeenCalledWith(1, {
        budgetNotification: false,
      });
    });

    test('should include warningThreshold when provided', async () => {
      res.locals.userId = 1;
      req.body = { warningThreshold: 90 };
      SettingsModel.updateUserPreferences.mockResolvedValueOnce({
        user_id: 1,
        warning_threshold: 90,
      });

      await settingsController.updatePreferences(req, res);

      expect(SettingsModel.updateUserPreferences).toHaveBeenCalledWith(1, { warningThreshold: 90 });
    });

    test('should return 404 when the model reports no updates/settings', async () => {
      res.locals.userId = 1;
      req.body = {};
      SettingsModel.updateUserPreferences.mockResolvedValueOnce(null);

      await settingsController.updatePreferences(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No updates provided or settings not found',
      });
    });

    test('should include exchange rate and currency info when countryCode is provided', async () => {
      res.locals.userId = 1;
      req.body = { countryCode: 'JP' };
      const updated = { user_id: 1, country_code: 'JP' };
      SettingsModel.updateUserPreferences.mockResolvedValueOnce(updated);

      await settingsController.updatePreferences(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          user_id: 1,
          country_code: 'JP',
          exchangeRate: 112.0,
          currencyInfo: { symbol: 'JPY ¥', code: 'JPY', display: 'JPY (¥)' },
        },
      });
    });

    test('should set exchangeRate and currencyInfo to null when countryCode is not provided', async () => {
      res.locals.userId = 1;
      req.body = { darkMode: true };
      const updated = { user_id: 1, dark_mode: true };
      SettingsModel.updateUserPreferences.mockResolvedValueOnce(updated);

      await settingsController.updatePreferences(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          user_id: 1,
          dark_mode: true,
          exchangeRate: null,
          currencyInfo: null,
        },
      });
    });

    test('should return 500 when the model throws', async () => {
      res.locals.userId = 1;
      req.body = { darkMode: true };
      const error = new Error('DB down');
      SettingsModel.updateUserPreferences.mockRejectedValueOnce(error);

      await settingsController.updatePreferences(req, res);

      expect(console.error).toHaveBeenCalledWith('Error updating preferences:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update preferences',
        error: 'DB down',
      });
    });
  });

  describe('deleteSettings', () => {
    test('should use res.locals.userId when present', async () => {
      res.locals.userId = 1;
      req.params.userId = 2;
      SettingsModel.deleteUserSettings.mockResolvedValueOnce({ user_id: 1 });

      await settingsController.deleteSettings(req, res);

      expect(SettingsModel.deleteUserSettings).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Settings deleted successfully',
      });
    });

    test('should fall back to req.params.userId when res.locals.userId is absent', async () => {
      req.params.userId = 2;
      SettingsModel.deleteUserSettings.mockResolvedValueOnce({ user_id: 2 });

      await settingsController.deleteSettings(req, res);

      expect(SettingsModel.deleteUserSettings).toHaveBeenCalledWith(2);
    });

    test('should return 404 when there was nothing to delete', async () => {
      res.locals.userId = 1;
      SettingsModel.deleteUserSettings.mockResolvedValueOnce(null);

      await settingsController.deleteSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Settings not found',
      });
    });

    test('should return 500 when the model throws', async () => {
      res.locals.userId = 1;
      const error = new Error('DB down');
      SettingsModel.deleteUserSettings.mockRejectedValueOnce(error);

      await settingsController.deleteSettings(req, res);

      expect(console.error).toHaveBeenCalledWith('Error deleting settings:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to delete settings',
        error: 'DB down',
      });
    });
  });

  describe('getCurrencyData', () => {
    test('should return 200 with currency and exchange rate data', () => {
      settingsController.getCurrencyData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          currencies: expect.objectContaining({ SG: expect.any(Object) }),
          exchangeRates: expect.objectContaining({ SG: 1.0 }),
        },
      });
    });

    test('should return 500 if building/sending the response throws', () => {
      const error = new Error('serialization failure');
      res.status
        .mockImplementationOnce(() => {
          throw error;
        })
        .mockReturnThis();

      settingsController.getCurrencyData(req, res);

      expect(console.error).toHaveBeenCalledWith('Error fetching currency data:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch currency data',
        error: 'serialization failure',
      });
    });
  });

  describe('createUserSettingsCountry', () => {
    test('should apply default values for optional fields and call next on success', () => {
      res.locals.userId = 1;
      req.body = { country: 'SG' };

      SettingsModel.createUserSettingsCountry.mockImplementation((data, callback) => {
        callback(null, {});
      });

      settingsController.createUserSettingsCountry(req, res, next);

      expect(SettingsModel.createUserSettingsCountry).toHaveBeenCalledWith(
        {
          userId: 1,
          country: 'SG',
          dark_mode: false,
          budgetNotification: true,
          warningThreshold: 80,
        },
        expect.any(Function),
      );
      expect(next).toHaveBeenCalled();
    });

    test('should use explicit values instead of defaults when provided', () => {
      res.locals.userId = 1;
      req.body = {
        country: 'JP',
        dark_mode: true,
        budgetNotification: false,
        warningThreshold: 50,
      };

      SettingsModel.createUserSettingsCountry.mockImplementation((data, callback) => {
        callback(null, {});
      });

      settingsController.createUserSettingsCountry(req, res, next);

      expect(SettingsModel.createUserSettingsCountry).toHaveBeenCalledWith(
        {
          userId: 1,
          country: 'JP',
          dark_mode: true,
          budgetNotification: false,
          warningThreshold: 50,
        },
        expect.any(Function),
      );
      expect(next).toHaveBeenCalled();
    });

    test('should return 500 and not call next when the model errors', () => {
      res.locals.userId = 1;
      req.body = { country: 'SG' };
      const error = new Error('constraint violation');

      SettingsModel.createUserSettingsCountry.mockImplementation((data, callback) => {
        callback(error);
      });

      settingsController.createUserSettingsCountry(req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error createUserSettingsCountry: ', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(error);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('queryCountries', () => {
    test('should store rows on res.locals.result and call next', () => {
      const rows = [{ code: 'SG', name: 'Singapore' }];

      SettingsModel.queryCountries.mockImplementation((callback) => {
        callback(null, { rows });
      });

      settingsController.queryCountries(req, res, next);

      expect(res.locals.result).toBe(rows);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 500 and not call next when the model errors', () => {
      const error = new Error('DB down');

      SettingsModel.queryCountries.mockImplementation((callback) => {
        callback(error);
      });

      settingsController.queryCountries(req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error queryCountries: ', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(error);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
