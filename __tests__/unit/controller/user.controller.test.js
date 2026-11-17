const userController = require('../../../src/controllers/userController.js');
const model = require('../../../src/models/userModel.js');

jest.mock('../../../src/models/userModel.js');

describe('userController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('readUserById', () => {
    test('should return 404 if userId is missing', () => {
      userController.readUserById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not logged in',
      });

      expect(model.readUserById).not.toHaveBeenCalled();
    });

    test('should call model and proceed when user exists', () => {
      res.locals.userId = 1;
      res.locals.token = 'abc123';

      const mockResult = {
        rows: [
          {
            userId: 1,
            username: 'testuser',
          },
        ],
      };

      model.readUserById.mockImplementation((data, callback) => {
        callback(null, mockResult);
      });

      userController.readUserById(req, res, next);

      expect(model.readUserById).toHaveBeenCalledWith(
        {
          userId: 1,
        },
        expect.any(Function),
      );

      expect(res.locals.result).toEqual({
        token: 'abc123',
        userId: 1,
        username: 'testuser',
      });

      expect(next).toHaveBeenCalled();
    });

    test('should return 404 when user does not exist', () => {
      res.locals.userId = 1;

      model.readUserById.mockImplementation((data, callback) => {
        callback(null, {
          rows: [],
        });
      });

      userController.readUserById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found',
      });

      expect(next).not.toHaveBeenCalled();
    });

    test('should return 500 when model throws error', () => {
      res.locals.userId = 1;

      const error = new Error('Database error');

      model.readUserById.mockImplementation((data, callback) => {
        callback(error);
      });

      userController.readUserById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(error);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('returnUserDetails', () => {
    test('should return user details successfully', () => {
      res.locals.userId = 1;
      res.locals.result = {
        token: 'abc123',
        userId: 1,
        username: 'testuser',
      };

      model.readUserById.mockImplementation((data, callback) => {
        callback(null, {
          rows: [
            {
              userId: 1,
              username: 'testuser',
            },
          ],
        });
      });

      userController.returnUserDetails(req, res, next);

      expect(model.readUserById).toHaveBeenCalledWith(
        {
          userId: 1,
        },
        expect.any(Function),
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(res.locals.result);
    });

    test('should return 404 when user does not exist', () => {
      res.locals.userId = 1;

      model.readUserById.mockImplementation((data, callback) => {
        callback(null, {
          rows: [],
        });
      });

      userController.returnUserDetails(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    test('should return 500 when database error occurs', () => {
      res.locals.userId = 1;

      const error = new Error('Database failure');

      model.readUserById.mockImplementation((data, callback) => {
        callback(error);
      });

      userController.returnUserDetails(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(error);
    });
  });
});
