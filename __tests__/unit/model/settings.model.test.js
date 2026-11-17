const pool = require('../../../src/services/db');
const SettingsModel = require('../../../src/models/settingsModel');

jest.mock('../../../src/services/db');

describe('SettingsModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUserSettings', () => {
    test('should return the combined user + settings row when found', async () => {
      const row = {
        user_id: 1,
        username: 'jdoe',
        email: 'jdoe@example.com',
        name: 'John Doe',
        dob: '1990-01-01',
        occupation: 'Engineer',
        dark_mode: true,
        country_code: 'US',
        budget_notification: true,
        warning_threshold: 80,
      };

      pool.query.mockResolvedValueOnce({ rows: [row] });

      const result = await SettingsModel.getAllUserSettings(1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN user_settings'),
        [1],
      );
      expect(result).toEqual(row);
    });

    test('should return null when no user is found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await SettingsModel.getAllUserSettings(999);

      expect(result).toBeNull();
    });

    test('should propagate errors thrown by pool.query', async () => {
      const error = new Error('DB down');
      pool.query.mockRejectedValueOnce(error);

      await expect(SettingsModel.getAllUserSettings(1)).rejects.toThrow('DB down');
    });
  });

  describe('getUserSettings', () => {
    test('should return the settings row when found', async () => {
      const row = {
        user_id: 1,
        dark_mode: false,
        country_code: 'FR',
        budget_notification: true,
        warning_threshold: 50,
      };

      pool.query.mockResolvedValueOnce({ rows: [row] });

      const result = await SettingsModel.getUserSettings(1);

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM user_settings'), [1]);
      expect(result).toEqual(row);
    });

    test('should return null when no settings row exists', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await SettingsModel.getUserSettings(1);

      expect(result).toBeNull();
    });

    test('should propagate errors thrown by pool.query', async () => {
      const error = new Error('DB down');
      pool.query.mockRejectedValueOnce(error);

      await expect(SettingsModel.getUserSettings(1)).rejects.toThrow('DB down');
    });
  });

  describe('updateUserProfile', () => {
    test('should return null and skip the query when no fields are provided', async () => {
      const result = await SettingsModel.updateUserProfile(1, {});

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should update a single field and build the query/params correctly', async () => {
      const updatedRow = { user_id: 1, username: 'newname' };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await SettingsModel.updateUserProfile(1, { username: 'newname' });

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('username = $1'), [
        'newname',
        1,
      ]);
      expect(result).toEqual(updatedRow);
    });

    test('should update multiple fields in the order provided, with userId last', async () => {
      const updatedRow = { user_id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      await SettingsModel.updateUserProfile(1, {
        username: 'jdoe',
        email: 'jdoe@example.com',
        name: 'John Doe',
        dob: '1990-01-01',
        occupation: 'Engineer',
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /username = \$1.*email = \$2.*name = \$3.*dob = \$4.*occupation = \$5/s,
        ),
        ['jdoe', 'jdoe@example.com', 'John Doe', '1990-01-01', 'Engineer', 1],
      );
    });

    test('should include password field only when passwordHash is truthy', async () => {
      const updatedRow = { user_id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      await SettingsModel.updateUserProfile(1, { passwordHash: 'hashed-pw' });

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('password = $1'), [
        'hashed-pw',
        1,
      ]);
    });

    test('should not include password field when passwordHash is an empty string', async () => {
      const result = await SettingsModel.updateUserProfile(1, { passwordHash: '' });

      // passwordHash uses a truthy check, not `!== undefined`, so an empty
      // string is treated the same as "not provided".
      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should allow explicitly clearing name/dob/occupation with empty string or null', async () => {
      const updatedRow = { user_id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      await SettingsModel.updateUserProfile(1, { name: '', dob: null });

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('name = $1'), ['', null, 1]);
    });

    test('should propagate errors thrown by pool.query', async () => {
      const error = new Error('DB down');
      pool.query.mockRejectedValueOnce(error);

      await expect(SettingsModel.updateUserProfile(1, { username: 'x' })).rejects.toThrow(
        'DB down',
      );
    });
  });

  describe('updateUserPreferences', () => {
    test('should return null and skip the query when no fields are provided', async () => {
      const result = await SettingsModel.updateUserPreferences(1, {});

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should update a single preference and build the query/params correctly', async () => {
      const updatedRow = { user_id: 1, dark_mode: true };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await SettingsModel.updateUserPreferences(1, { darkMode: true });

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('dark_mode = $1'), [true, 1]);
      expect(result).toEqual(updatedRow);
    });

    test('should update all preference fields in order, with userId last', async () => {
      const updatedRow = { user_id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      await SettingsModel.updateUserPreferences(1, {
        darkMode: false,
        countryCode: 'DE',
        budgetNotification: false,
        warningThreshold: 0,
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringMatching(
          /dark_mode = \$1.*country_code = \$2.*budget_notification = \$3.*warning_threshold = \$4/s,
        ),
        [false, 'DE', false, 0, 1],
      );
    });

    test('should preserve explicit falsy values like false and 0', async () => {
      const updatedRow = { user_id: 1 };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      await SettingsModel.updateUserPreferences(1, {
        budgetNotification: false,
        warningThreshold: 0,
      });

      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [false, 0, 1]);
    });

    test('should propagate errors thrown by pool.query', async () => {
      const error = new Error('DB down');
      pool.query.mockRejectedValueOnce(error);

      await expect(SettingsModel.updateUserPreferences(1, { darkMode: true })).rejects.toThrow(
        'DB down',
      );
    });
  });

  describe('deleteUserSettings', () => {
    test('should delete settings and return the deleted user_id', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] });

      const result = await SettingsModel.deleteUserSettings(1);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM user_settings WHERE user_id = $1 RETURNING user_id',
        [1],
      );
      expect(result).toEqual({ user_id: 1 });
    });

    test('should return undefined when there was nothing to delete', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await SettingsModel.deleteUserSettings(999);

      expect(result).toBeUndefined();
    });

    test('should propagate errors thrown by pool.query', async () => {
      const error = new Error('DB down');
      pool.query.mockRejectedValueOnce(error);

      await expect(SettingsModel.deleteUserSettings(1)).rejects.toThrow('DB down');
    });
  });

  describe('createUserSettingsCountry', () => {
    test('should insert/upsert settings and invoke the callback with results', () => {
      const data = {
        userId: 1,
        country: 'US',
        dark_mode: true,
        budgetNotification: true,
        warningThreshold: 80,
      };
      const callback = jest.fn();

      pool.query.mockImplementation((sql, values, cb) => {
        cb(null, { rowCount: 1 }, undefined);
      });

      SettingsModel.createUserSettingsCountry(data, callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_settings'),
        [1, 'US', true, true, 80],
        expect.any(Function),
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (user_id)'),
        expect.any(Array),
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalledWith(null, { rowCount: 1 }, undefined);
    });

    test('should invoke the callback with an error when the query fails', () => {
      const data = {
        userId: 1,
        country: 'US',
        dark_mode: false,
        budgetNotification: false,
        warningThreshold: 80,
      };
      const callback = jest.fn();
      const error = new Error('constraint violation');

      pool.query.mockImplementation((sql, values, cb) => {
        cb(error);
      });

      SettingsModel.createUserSettingsCountry(data, callback);

      expect(callback).toHaveBeenCalledWith(error);
    });
  });

  describe('queryCountries', () => {
    test('should query all countries and invoke the callback with results', () => {
      const callback = jest.fn();
      const rows = [
        { code: 'US', name: 'United States' },
        { code: 'FR', name: 'France' },
      ];

      pool.query.mockImplementation((sql, cb) => {
        cb(null, { rows });
      });

      SettingsModel.queryCountries(callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM countries'),
        expect.any(Function),
      );
      expect(callback).toHaveBeenCalledWith(null, { rows });
    });

    test('should invoke the callback with an error when the query fails', () => {
      const callback = jest.fn();
      const error = new Error('DB down');

      pool.query.mockImplementation((sql, cb) => {
        cb(error);
      });

      SettingsModel.queryCountries(callback);

      expect(callback).toHaveBeenCalledWith(error);
    });
  });
});
