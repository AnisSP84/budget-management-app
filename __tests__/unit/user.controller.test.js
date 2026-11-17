const controller = require('../../src/controllers/userController');
const model = require('../../src/models/userModel');

jest.mock('../../src/models/userModel');

describe('User Controller Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('readUserById Step', () => {
    test('should return 404 if res.locals.userId is missing', () => {
      res.locals = {};
      controller.readUserById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not logged in' });
      expect(model.readUserById).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 500 if the model returns an error', () => {
      res.locals.userId = 67;
      const mockError = { message: 'Database failure' };
      model.readUserById.mockImplementationOnce((data, callback) => {
        callback(mockError, null, null);
      });
      controller.readUserById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(mockError);
    });

    test('should return 404 if no matching user found in database', () => {
      res.locals.userId = 67;
      // FIX: Nest empty array inside rows property
      const mockResults = { rows: [] };
      model.readUserById.mockImplementationOnce((data, callback) => {
        callback(null, mockResults, null);
      });
      controller.readUserById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    test('should store user data in res.locals and call next() on success', () => {
      res.locals.userId = 67;
      res.locals.token = 'placeholder-token';
      // FIX: Nest data inside rows array
      const mockResults = {
        rows: [
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
        ],
      };
      model.readUserById.mockImplementationOnce((data, callback) => {
        callback(null, mockResults, null);
      });
      controller.readUserById(req, res, next);
      expect(res.locals.result).toEqual({
        token: 'placeholder-token',
        user_id: 6,
        username: 'testuser',
        email: 'testuser@example.com',
        password: '1234',
        name: 'Testuser',
        dob: '2008-01-06',
        occupation: 'unemployed',
        created_at: '2023-01-01',
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('returnUserDetails Step', () => {
    test('should respond with 200 and the JSON payload stored in res.locals.result', () => {
      res.locals.userId = 67;
      res.locals.result = {
        token: 'placeholder-token',
        user_id: 6,
        username: 'testuser',
      };
      // FIX: Change structure to match what controller expects
      const mockResults = { rows: [{ user_id: 6 }] };
      model.readUserById.mockImplementationOnce((data, callback) => {
        callback(null, mockResults, null);
      });
      controller.returnUserDetails(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        token: 'placeholder-token',
        user_id: 6,
        username: 'testuser',
      });
    });
  });
});
