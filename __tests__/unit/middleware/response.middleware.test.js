const { withMessage, sendResponse } = require('../../../src/middleware/response');

describe('responseUtils.js', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {};

    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  /* ==========================================================================
     1. withMessage
     ========================================================================== */
  describe('withMessage', () => {
    test('should set res.locals.message and call next()', () => {
      const middleware = withMessage('Custom message');

      middleware(req, res, next);

      expect(res.locals.message).toBe('Custom message');
      expect(res.locals.status).toBeUndefined();
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('should set res.locals.message and res.locals.status when status is provided', () => {
      const middleware = withMessage('User created successfully', 201);

      middleware(req, res, next);

      expect(res.locals.message).toBe('User created successfully');
      expect(res.locals.status).toBe(201);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  /* ==========================================================================
     2. sendResponse
     ========================================================================== */
  describe('sendResponse', () => {
    test('should send default status (200) and default message ("Success") if res.locals is empty', () => {
      sendResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Success',
        result: undefined,
      });
    });

    test('should send custom status and message from res.locals', () => {
      res.locals.status = 201;
      res.locals.message = 'Resource created';
      res.locals.result = { id: 10, name: 'Item A' };

      sendResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Resource created',
        result: { id: 10, name: 'Item A' },
      });
    });

    test('should send result correctly without mutating res.locals outside the function scope', () => {
      res.locals.status = 200;
      res.locals.message = 'Operation successful';
      res.locals.result = [1, 2, 3];
      res.locals.userId = 99; // Extra property in res.locals

      sendResponse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Operation successful',
        result: [1, 2, 3],
      });

      // Confirm res.locals in the actual response object wasn't permanently mutated/deleted
      expect(res.locals.message).toBe('Operation successful');
    });
  });
});
