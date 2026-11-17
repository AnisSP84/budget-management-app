const pool = require('../../../src/services/db');
const authModel = require('../../../src/models/authModel'); // Adjust path if needed

// Mock database
jest.mock('../../../src/services/db', () => ({
  query: jest.fn(),
  end: jest.fn(),
}));

afterAll(() => {
  jest.restoreAllMocks();
});

describe('User Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkExistingUsernames', () => {
    test('should query username from database', (done) => {
      const data = { username: 'john' };

      const fakeRows = [
        {
          user_id: 1,
          username: 'john',
          email: 'john@test.com',
        },
      ];

      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, { rows: fakeRows });
      });

      authModel.checkExistingUsernames(data, (err, result) => {
        expect(err).toBeNull();
        expect(result.rows).toEqual(fakeRows);

        expect(pool.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM users'),
          ['john'],
          expect.any(Function),
        );

        done();
      });
    });

    test('should return database error', (done) => {
      const error = new Error('Database Error');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      authModel.checkExistingUsernames({ username: 'john' }, (err, result) => {
        expect(err).toBe(error);
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('checkUsernameOrEmailExist', () => {
    test('should query username or email', (done) => {
      const data = {
        username: 'john',
        email: 'john@test.com',
      };

      const fakeRows = [
        {
          user_id: 1,
          username: 'john',
          email: 'john@test.com',
        },
      ];

      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, { rows: fakeRows });
      });

      authModel.checkUsernameOrEmailExist(data, (err, result) => {
        expect(err).toBeNull();
        expect(result.rows).toEqual(fakeRows);

        expect(pool.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE username = $1 OR email = $2'),
          ['john', 'john@test.com'],
          expect.any(Function),
        );

        done();
      });
    });

    test('should handle database error', (done) => {
      const error = new Error('Database Error');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      authModel.checkUsernameOrEmailExist(
        {
          username: 'john',
          email: 'john@test.com',
        },
        (err) => {
          expect(err).toBe(error);
          done();
        },
      );
    });
  });

  describe('createNewUser', () => {
    test('should insert new user', (done) => {
      const data = {
        username: 'john',
        email: 'john@test.com',
        password: 'hashedpassword',
      };

      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, {
          rows: [{ user_id: 5 }],
        });
      });

      authModel.createNewUser(data, (err, result) => {
        expect(err).toBeNull();
        expect(result.rows[0].user_id).toBe(5);

        expect(pool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO users'),
          ['john', 'john@test.com', 'hashedpassword'],
          expect.any(Function),
        );

        done();
      });
    });

    test('should return insert error', (done) => {
      const error = new Error('Insert failed');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      authModel.createNewUser(
        {
          username: 'john',
          email: 'john@test.com',
          password: '123',
        },
        (err) => {
          expect(err).toBe(error);
          done();
        },
      );
    });
  });

  describe('saveRefreshToken', () => {
    test('should save refresh token', (done) => {
      const data = {
        userId: 1,
        refreshToken: 'abc123',
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, {
          rows: [{ token: 'abc123' }],
        });
      });

      authModel.saveRefreshToken(data, (err, result) => {
        expect(err).toBeNull();
        expect(result.rows[0].token).toBe('abc123');

        expect(pool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO refresh_tokens'),
          [data.userId, data.refreshToken, data.expiresAt, data.createdAt],
          expect.any(Function),
        );

        done();
      });
    });

    test('should return database error', (done) => {
      const error = new Error('Insert failed');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      authModel.saveRefreshToken(
        {
          userId: 1,
          refreshToken: 'abc',
          expiresAt: new Date(),
          createdAt: new Date(),
        },
        (err) => {
          expect(err).toBe(error);
          done();
        },
      );
    });
  });

  describe('checkRefreshToken', () => {
    test('should query refresh token', (done) => {
      const data = {
        refreshToken: 'abc123',
      };

      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, {
          rows: [{ token: 'abc123' }],
        });
      });

      authModel.checkRefreshToken(data, (err, result) => {
        expect(err).toBeNull();
        expect(result.rows[0].token).toBe('abc123');

        expect(pool.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT *'),
          ['abc123'],
          expect.any(Function),
        );

        done();
      });
    });

    test('should return query error', (done) => {
      const error = new Error('Query failed');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      authModel.checkRefreshToken(
        {
          refreshToken: 'abc123',
        },
        (err) => {
          expect(err).toBe(error);
          done();
        },
      );
    });
  });
});
