const bcrypt = require('bcrypt');
const bcryptMiddleware = require('../../../src/middleware/bcryptMiddleware'); // Adjust path to match your file structure

jest.mock('bcrypt');

describe('bcryptMiddleware.js', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    req = {
      body: {},
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

  /* ==========================================================================
     1. comparePassword
     ========================================================================== */
  describe('comparePassword', () => {
    test('should call next() if password matches', () => {
      req.body.password = 'mySecretPassword';
      res.locals.hash = '$2b$10$mockedHashValue';

      bcrypt.compare.mockImplementation((plainText, hash, callback) => {
        callback(null, true);
      });

      bcryptMiddleware.comparePassword(req, res, next);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        expect.stringContaining('mySecretPassword'),
        '$2b$10$mockedHashValue',
        expect.any(Function),
      );
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should return 401 status with "Wrong password" message if password does not match', () => {
      req.body.password = 'incorrectPassword';
      res.locals.hash = '$2b$10$mockedHashValue';

      bcrypt.compare.mockImplementation((plainText, hash, callback) => {
        callback(null, false);
      });

      bcryptMiddleware.comparePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Wrong password',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 500 status and log error if bcrypt.compare fails', () => {
      req.body.password = 'mySecretPassword';
      res.locals.hash = '$2b$10$mockedHashValue';
      const bcryptError = new Error('Bcrypt comparison failed');

      bcrypt.compare.mockImplementation((plainText, hash, callback) => {
        callback(bcryptError, null);
      });

      bcryptMiddleware.comparePassword(req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error bcrypt:', bcryptError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(bcryptError);
      expect(next).not.toHaveBeenCalled();
    });
  });

  /* ==========================================================================
     2. hashPassword
     ========================================================================== */
  describe('hashPassword', () => {
    test('should set res.locals.hash and call next() on successful hashing', () => {
      req.body.password = 'mySecretPassword';

      bcrypt.hash.mockImplementation((plainText, saltRounds, callback) => {
        callback(null, '$2b$10$generatedHashValue');
      });

      bcryptMiddleware.hashPassword(req, res, next);

      expect(bcrypt.hash).toHaveBeenCalledWith(
        expect.stringContaining('mySecretPassword'),
        10,
        expect.any(Function),
      );
      expect(res.locals.hash).toBe('$2b$10$generatedHashValue');
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should return 500 status and log error if bcrypt.hash fails', () => {
      req.body.password = 'mySecretPassword';
      const bcryptError = new Error('Bcrypt hashing failed');

      bcrypt.hash.mockImplementation((plainText, saltRounds, callback) => {
        callback(bcryptError, null);
      });

      bcryptMiddleware.hashPassword(req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error bcrypt:', bcryptError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(bcryptError);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
