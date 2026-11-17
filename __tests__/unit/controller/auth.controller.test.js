const controller = require('../../../src/controllers/authController');
const model = require('../../../src/models/authModel');

jest.mock('../../../src/models/authModel', () => ({
  checkUsernameOrEmailExist: jest.fn(),
  createNewUser: jest.fn(),
  checkExistingUsernames: jest.fn(),
  saveRefreshToken: jest.fn(),
  checkRefreshToken: jest.fn(),
}));

describe('authController.js - checkUsernameOrEmailExist', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

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

  test('should return 400 if username, email or password is missing', () => {
    req.body = {
      username: 'john',
      email: undefined,
      password: '123',
    };

    controller.checkUsernameOrEmailExist(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Error: username, email or password doesn't exist",
    });
    expect(model.checkUsernameOrEmailExist).not.toHaveBeenCalled();
  });

  test('should return 409 if username or email already exists', () => {
    req.body = {
      username: 'john',
      email: 'john@test.com',
      password: '123',
    };

    model.checkUsernameOrEmailExist.mockImplementation((data, callback) => {
      callback(null, { rows: [{}] });
    });

    controller.checkUsernameOrEmailExist(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Username or email already exists',
    });
  });

  test('should call next when username and email do not exist', () => {
    req.body = {
      username: 'john',
      email: 'john@test.com',
      password: '123',
    };

    model.checkUsernameOrEmailExist.mockImplementation((data, callback) => {
      callback(null, { rows: [] });
    });

    controller.checkUsernameOrEmailExist(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('should return 500 when database returns an error', () => {
    req.body = {
      username: 'john',
      email: 'john@test.com',
      password: '123',
    };

    const error = new Error('Database Error');

    model.checkUsernameOrEmailExist.mockImplementation((data, callback) => {
      callback(error);
    });

    controller.checkUsernameOrEmailExist(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(error);
  });
});

describe('authController.js - createNewUser', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {
        username: 'john',
        email: 'john@test.com',
      },
    };

    res = {
      locals: {
        hash: 'hashedPassword',
      },
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  test('should create user and call next', () => {
    model.createNewUser.mockImplementation((data, callback) => {
      callback(null, {
        rows: [{ user_id: 5 }],
      });
    });

    controller.createNewUser(req, res, next);

    expect(model.createNewUser).toHaveBeenCalledTimes(1);
    expect(res.locals.userId).toBe(5);
    expect(next).toHaveBeenCalled();
  });

  test('should return 500 if database fails', () => {
    const error = new Error('Insert failed');

    model.createNewUser.mockImplementation((data, callback) => {
      callback(error);
    });

    controller.createNewUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(error);
  });
});

describe('authController.js - login', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

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

  test('should return 400 if username or password is missing', () => {
    controller.login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Error: username or password doesn't exist",
    });
  });

  test('should return 404 if user does not exist', () => {
    req.body = {
      username: 'john',
      password: '123',
    };

    model.checkExistingUsernames.mockImplementation((data, callback) => {
      callback(null, { rows: [] });
    });

    controller.login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User not found',
    });
  });

  test('should call next when login data is valid', () => {
    req.body = {
      username: 'john',
      password: '123',
    };

    model.checkExistingUsernames.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            user_id: 7,
            password: 'hashedPassword',
          },
        ],
      });
    });

    controller.login(req, res, next);

    expect(res.locals.userId).toBe(7);
    expect(res.locals.hash).toBe('hashedPassword');
    expect(next).toHaveBeenCalled();
  });

  test('should return 500 if database fails', () => {
    req.body = {
      username: 'john',
      password: '123',
    };

    const error = new Error('Database Error');

    model.checkExistingUsernames.mockImplementation((data, callback) => {
      callback(error);
    });

    controller.login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(error);
  });
});

describe('authController.js - checkRefreshToken', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      signedCookies: {},
    };

    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  test('should return 401 if refresh token is missing', () => {
    controller.checkRefreshToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No refresh token provided',
    });
  });

  test('should return 401 if refresh token is not found', () => {
    req.signedCookies.refreshToken = 'token';

    model.checkRefreshToken.mockImplementation((data, callback) => {
      callback(null, { rows: [] });
    });

    controller.checkRefreshToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Refresh token not found',
    });
  });

  test('should return 401 if refresh token has expired', () => {
    req.signedCookies.refreshToken = 'token';

    model.checkRefreshToken.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            user_id: 1,
            expires_at: '2020-01-01',
          },
        ],
      });
    });

    controller.checkRefreshToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Refresh token expired',
    });
  });

  test('should call next if refresh token is valid', () => {
    req.signedCookies.refreshToken = 'token';

    model.checkRefreshToken.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            user_id: 1,
            expires_at: '2999-01-01',
          },
        ],
      });
    });

    controller.checkRefreshToken(req, res, next);

    expect(res.locals.userId).toBe(1);
    expect(res.locals.refreshToken).toBe('token');
    expect(next).toHaveBeenCalled();
  });

  test('should return 500 if database fails', () => {
    req.signedCookies.refreshToken = 'token';

    const error = new Error('Database Error');

    model.checkRefreshToken.mockImplementation((data, callback) => {
      callback(error);
    });

    controller.checkRefreshToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(error);
  });
});
describe('authController.js - issueRefreshToken', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});

    req = {};

    res = {
      locals: {
        userId: 42,
        refreshToken: 'sampleRefreshToken',
        data: {
          createdAt: new Date(),
        },
      },
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should save refresh token, set signed cookie, and call next on success', () => {
    const mockDbToken = 'tokenFromDatabase';

    model.saveRefreshToken.mockImplementation((data, callback) => {
      callback(null, { rows: [{ token: mockDbToken }] });
    });

    controller.issueRefreshToken(req, res, next);

    // Verify model was called with accumulated payload
    expect(model.saveRefreshToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        refreshToken: 'sampleRefreshToken',
      }),
      expect.any(Function),
    );

    // Verify cookie parameters
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', mockDbToken, {
      httpOnly: false,
      secure: true,
      sameSite: 'strict',
      signed: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('should handle database error, log error, and return status 500', () => {
    const dbError = new Error('Database insertion failed');

    model.saveRefreshToken.mockImplementation((data, callback) => {
      callback(dbError, null);
    });

    controller.issueRefreshToken(req, res, next);

    expect(console.log).toHaveBeenCalledWith('Error issuseRefreshToken: ', dbError);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(dbError);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authController.js - VerifyCaptcha', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  test('should call next() when captcha input matches captcha answer', () => {
    req.body = {
      captchaInput: 'ABCD',
      captchaAnswer: 'ABCD',
    };

    controller.VerifyCaptcha(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('should return 400 when captcha input does not match captcha answer', () => {
    req.body = {
      captchaInput: 'ABCD',
      captchaAnswer: 'WXYZ',
    };

    controller.VerifyCaptcha(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith('Incorrect captcha. Please try again.');
  });
});
