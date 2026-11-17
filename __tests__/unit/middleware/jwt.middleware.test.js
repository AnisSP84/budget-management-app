process.env.JWT_SECRET_KEY = 'test-secret';
process.env.JWT_SECRET_REFRESH_KEY = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_ALGORITHM = 'HS256';

const jwt = require('jsonwebtoken');
const jwtMiddleware = require('../../../src/middleware/jwtMiddleware');

jest.mock('jsonwebtoken');

describe('jwtMiddleware.js', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    req = {
      headers: {},
      signedCookies: {},
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

  describe('generateToken', () => {
    test('should generate token successfully', () => {
      res.locals.userId = 123;

      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        callback(null, 'mockToken');
      });

      jwtMiddleware.generateToken(req, res, next);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 123,
          timestamp: expect.any(Date),
        }),
        'test-secret',
        {
          algorithm: 'HS256',
          expiresIn: '1h',
        },
        expect.any(Function),
      );

      expect(res.locals.token).toBe('mockToken');
      expect(next).toHaveBeenCalled();
    });

    test('should return 500 when token generation fails', () => {
      const error = new Error('JWT error');

      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        callback(error, null);
      });

      jwtMiddleware.generateToken(req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error jwt:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(error);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('generateRefreshToken', () => {
    test('should generate refresh token with default expiry when rememberMe is false', () => {
      res.locals.userId = 123;
      req.body.rememberMe = false;

      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        expect(options.expiresIn).toBe('1d');
        callback(null, 'refreshToken');
      });

      jwtMiddleware.generateRefreshToken(req, res, next);

      expect(res.locals.refreshToken).toBe('refreshToken');
      expect(res.locals.data).toHaveProperty('createdAt');
      expect(res.locals.data).toHaveProperty('expiresAt');
      expect(next).toHaveBeenCalled();
    });

    test('should default to 1 day expiry when rememberMe is not provided at all', () => {
      res.locals.userId = 123;
      // req.body.rememberMe intentionally left undefined

      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        expect(options.expiresIn).toBe('1d');
        callback(null, 'refreshToken');
      });

      jwtMiddleware.generateRefreshToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should default to 1 day expiry when req.body itself is undefined', () => {
      res.locals.userId = 123;
      req.body = undefined;

      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        expect(options.expiresIn).toBe('1d');
        callback(null, 'refreshToken');
      });

      jwtMiddleware.generateRefreshToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should generate refresh token with 30 day expiry when rememberMe enabled', () => {
      res.locals.userId = 123;
      req.body.rememberMe = true;

      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        expect(options.expiresIn).toBe('30d');
        callback(null, 'refreshToken');
      });

      jwtMiddleware.generateRefreshToken(req, res, next);

      expect(res.locals.refreshToken).toBe('refreshToken');
      expect(next).toHaveBeenCalled();
    });

    test('expiresAt should be ~30 days out when rememberMe enabled', () => {
      res.locals.userId = 123;
      req.body.rememberMe = true;

      const now = Date.now();
      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        callback(null, 'refreshToken');
      });

      jwtMiddleware.generateRefreshToken(req, res, next);

      const diff = res.locals.data.expiresAt.getTime() - now;
      expect(diff).toBeGreaterThanOrEqual(2592000000 - 1000);
      expect(diff).toBeLessThanOrEqual(2592000000 + 1000);
    });

    test('expiresAt should be ~1 day out when rememberMe disabled', () => {
      res.locals.userId = 123;
      req.body.rememberMe = false;

      const now = Date.now();
      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        callback(null, 'refreshToken');
      });

      jwtMiddleware.generateRefreshToken(req, res, next);

      const diff = res.locals.data.expiresAt.getTime() - now;
      expect(diff).toBeGreaterThanOrEqual(86400000 - 1000);
      expect(diff).toBeLessThanOrEqual(86400000 + 1000);
    });

    test('should return 500 when refresh token generation fails', () => {
      const error = new Error('Refresh JWT error');

      jwt.sign.mockImplementation((payload, secret, options, callback) => {
        callback(error, null);
      });

      jwtMiddleware.generateRefreshToken(req, res, next);

      expect(console.error).toHaveBeenCalledWith('Error jwt:', error);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(error);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('sendToken', () => {
    test('should send token response', () => {
      res.locals.message = 'Success';
      res.locals.token = 'token';

      jwtMiddleware.sendToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Success',
        token: 'token',
      });
    });

    test('should send response even when message/token are undefined', () => {
      jwtMiddleware.sendToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: undefined,
        token: undefined,
      });
    });
  });

  describe('verifyToken', () => {
    test('should return 401 when Authorization header is missing entirely', () => {
      jwtMiddleware.verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when Authorization header does not use Bearer scheme', () => {
      req.headers.authorization = 'Basic sometoken';

      jwtMiddleware.verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No token provided',
      });
      expect(jwt.verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when Bearer prefix is present but token is empty', () => {
      req.headers.authorization = 'Bearer ';

      jwtMiddleware.verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No token provided',
      });
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test('should return 401 when token expired', () => {
      req.headers.authorization = 'Bearer expired';

      const error = new Error();
      error.name = 'TokenExpiredError';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(error);
      });

      jwtMiddleware.verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 with generic invalid token error for non-expiry failures', () => {
      req.headers.authorization = 'Bearer malformed';

      const error = new Error();
      error.name = 'JsonWebTokenError';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(error);
      });

      jwtMiddleware.verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should save user data and call next for valid token', () => {
      req.headers.authorization = 'Bearer valid';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, {
          userId: 123,
          timestamp: 'date',
        });
      });

      jwtMiddleware.verifyToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid', 'test-secret', expect.any(Function));
      expect(res.locals.userId).toBe(123);
      expect(res.locals.tokenTimestamp).toBe('date');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('verifyExpiredToken', () => {
    test('should return 401 when Authorization header is missing entirely', () => {
      jwtMiddleware.verifyExpiredToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test('should return 401 when Authorization header does not use Bearer scheme', () => {
      req.headers.authorization = 'Basic sometoken';

      jwtMiddleware.verifyExpiredToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test('should return 401 when Bearer prefix is present but token is empty', () => {
      req.headers.authorization = 'Bearer ';

      jwtMiddleware.verifyExpiredToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    test('should return 204 when token is still valid (not expired)', () => {
      req.headers.authorization = 'Bearer valid';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, {});
      });

      jwtMiddleware.verifyExpiredToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalledWith({});
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next when token is expired', () => {
      req.headers.authorization = 'Bearer expired';

      const error = new Error();
      error.name = 'TokenExpiredError';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(error);
      });

      jwtMiddleware.verifyExpiredToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should neither respond nor call next for a non-expiry verification error (documents current behavior)', () => {
      req.headers.authorization = 'Bearer malformed';

      const error = new Error();
      error.name = 'JsonWebTokenError';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(error);
      });

      jwtMiddleware.verifyExpiredToken(req, res, next);

      // NOTE: the middleware only handles the success case and
      // TokenExpiredError explicitly; any other error falls through
      // without a response or next() call. This test pins that behavior
      // so a future fix is a deliberate, visible change.
      expect(res.status).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('verifyRefreshToken', () => {
    test('should return 401 when refresh token cookie is missing', () => {
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('jwt must be provided'));
      });

      jwtMiddleware.verifyRefreshToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        undefined,
        'test-refresh-secret',
        expect.any(Function),
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid refresh token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when refresh token is invalid', () => {
      req.signedCookies.refreshToken = 'bad-token';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('invalid'));
      });

      jwtMiddleware.verifyRefreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid refresh token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when refresh token is expired', () => {
      req.signedCookies.refreshToken = 'expired-token';

      const error = new Error();
      error.name = 'TokenExpiredError';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(error);
      });

      jwtMiddleware.verifyRefreshToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid refresh token',
      });
    });

    test('should set userId and refreshToken then call next when refresh token valid', () => {
      req.signedCookies.refreshToken = 'refresh';

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, {
          userId: 999,
        });
      });

      jwtMiddleware.verifyRefreshToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        'refresh',
        'test-refresh-secret',
        expect.any(Function),
      );
      expect(res.locals.userId).toBe(999);
      expect(res.locals.refreshToken).toBe('refresh');
      expect(next).toHaveBeenCalled();
    });
  });
});
