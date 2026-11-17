const pool = require('../../../src/services/db');
const model = require('../../../src/models/userModel');

jest.mock('../../../src/services/db', () => ({
  query: jest.fn(),
}));

describe('userModel Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // readUserById
  // ============================================
  describe('readUserById', () => {
    it('should execute SELECT query with userId', () => {
      const callback = jest.fn();

      const data = {
        userId: 1,
      };

      model.readUserById(data, callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users'),
        [1],
        callback,
      );
    });

    it('should pass different userId correctly', () => {
      const callback = jest.fn();

      const data = {
        userId: 99,
      };

      model.readUserById(data, callback);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [99],
        callback,
      );
    });

    it('should call pool.query only once', () => {
      const callback = jest.fn();

      model.readUserById(
        {
          userId: 5,
        },
        callback,
      );

      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should use callback provided to query', () => {
      const callback = jest.fn();

      model.readUserById(
        {
          userId: 10,
        },
        callback,
      );

      const queryCallback = pool.query.mock.calls[0][2];

      expect(queryCallback).toBe(callback);
    });

    it('should handle undefined userId value', () => {
      const callback = jest.fn();

      model.readUserById(
        {
          userId: undefined,
        },
        callback,
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        [undefined],
        callback,
      );
    });
  });
});
