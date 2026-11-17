// 1. Correct the database pool import to match your project structure
const pool = require('../../src/services/db');
const { readUserById } = require('../../src/models/userModel');

// 2. Fix the mock path so it matches the exact string used in the require statement above
jest.mock('../../src/services/db', () => ({
  query: jest.fn(),
  end: jest.fn(),
}));

describe('userModel.js - readUserById', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully retrieve user data from database', (done) => {
    const testData = { userId: 6 };
    const mockDbResult = [
      {
        user_id: 6,
        username: 'testuser',
        email: 'testuser@example.com',
        password: '1234',
        name: 'Testuser',
        dob: '2008-01-06',
        occupation: 'unemployed',
        created_at: '2023-01-01',
      },
    ];

    pool.query.mockImplementation((sql, values, callback) => {
      callback(null, mockDbResult);
    });

    const callback = (err, results) => {
      try {
        expect(err).toBeNull();
        expect(results).toEqual(mockDbResult);
        expect(pool.query).toHaveBeenCalledTimes(1);

        // 3. Fixed Assertion: A read/get query by ID should only send the ID parameter
        expect(pool.query.mock.calls[0][1]).toEqual([6]);

        done();
      } catch (e) {
        done(e); // Pass error to done() if assertions fail in async code
      }
    };

    readUserById(testData, callback);
  });

  test('should return an error (error handling)', (done) => {
    const testData = { userId: 999 };
    const dbError = new Error('database connection timeout');

    pool.query.mockImplementation((sql, values, callback) => {
      callback(dbError, null);
    });

    readUserById(testData, (error, results) => {
      try {
        expect(error).toEqual(dbError);
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});
