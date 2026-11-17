const controller = require('../../../src/controllers/budgetController');
const model = require('../../../src/models/budgetModel');

// Explicitly mock all model methods called by budgetController.js
jest.mock('../../../src/models/budgetModel', () => ({
  getBudgetByUserId: jest.fn(),
  updateBudgetByUserId: jest.fn(),
  insertBudget: jest.fn(),
  getCombinedBudgetData: jest.fn(),
  getCategoryBreakdown: jest.fn(),
  createBudgetNotification: jest.fn(),
}));

describe('budgetController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      locals: { userId: 1 },
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // 1. updateBudget
  describe('updateBudget', () => {
    it('should return 401 if userId is missing', () => {
      res.locals.userId = undefined;
      req.body = { amount: 500 };

      controller.updateBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized access. Missing session token.',
      });
    });

    it('should return 400 if amount is missing', () => {
      req.body = {};
      controller.updateBudget(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle check error and return 500', () => {
      req.body = { amount: 500 };
      model.getBudgetByUserId.mockImplementation((userId, cb) => cb(new Error('DB Error'), null));

      controller.updateBudget(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should update existing budget successfully (200)', () => {
      req.body = { amount: 500 };
      model.getBudgetByUserId.mockImplementation((userId, cb) => cb(null, { rows: [{ id: 1 }] }));
      model.updateBudgetByUserId.mockImplementation((data, cb) => cb(null, { rowCount: 1 }));

      controller.updateBudget(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 when updating an existing budget fails', () => {
      req.body = { amount: 500 };
      model.getBudgetByUserId.mockImplementation((userId, cb) => cb(null, { rows: [{ id: 1 }] }));
      model.updateBudgetByUserId.mockImplementation((data, cb) => cb(new Error('DB Error'), null));

      controller.updateBudget(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });

    it('should create new budget if none exists (200)', () => {
      req.body = { amount: 500 };
      model.getBudgetByUserId.mockImplementation((userId, cb) => cb(null, { rows: [] }));
      model.insertBudget.mockImplementation((data, cb) => cb(null, { rows: [{ id: 1 }] }));

      controller.updateBudget(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 when creating a new budget fails', () => {
      req.body = { amount: 500 };
      model.getBudgetByUserId.mockImplementation((userId, cb) => cb(null, { rows: [] }));
      model.insertBudget.mockImplementation((data, cb) => cb(new Error('DB Error'), null));

      controller.updateBudget(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });
  });

  // 2. getBudget
  describe('getBudget', () => {
    it('should return 401 if userId is missing', () => {
      res.locals.userId = undefined;

      controller.getBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized access. Missing session token.',
      });
    });

    it('should handle model error and return 500', () => {
      model.getBudgetByUserId.mockImplementation((userId, cb) => cb(new Error('DB Error'), null));

      controller.getBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });

    it('should return default budget when none is set', () => {
      model.getBudgetByUserId.mockImplementation((userId, cb) => cb(null, { rows: [] }));

      controller.getBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ amount: 0.0, description: 'No Budget Set' });
    });

    it('should return the budget row when one exists', () => {
      const row = { amount: 500, description: 'Main Monthly Budget' };
      model.getBudgetByUserId.mockImplementation((userId, cb) => cb(null, { rows: [row] }));

      controller.getBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(row);
    });
  });

  // 3. getCombinedBudgetData
  describe('getCombinedBudgetData', () => {
    it('should return 401 if userId is missing', () => {
      res.locals.userId = undefined;

      controller.getCombinedBudgetData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized access. Missing session token.',
      });
    });

    it('should return default combined budget data when no rows exist', () => {
      model.getCombinedBudgetData.mockImplementation((userId, cb) =>
        cb(null, { budget: 1000, transactions: [] }),
      );

      controller.getCombinedBudgetData(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        budget_limit: 0.0,
        total_spent: 0.0,
        amount: 0.0,
      });
    });

    it('should return the combined budget row when data exists', () => {
      const row = { budget_limit: 1000, total_spent: 250, amount: 1000 };
      model.getCombinedBudgetData.mockImplementation((userId, cb) => cb(null, { rows: [row] }));

      controller.getCombinedBudgetData(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(row);
    });

    it('should handle model error in budget query (500)', () => {
      model.getCombinedBudgetData.mockImplementation((userId, cb) =>
        cb(new Error('DB Error'), null),
      );

      controller.getCombinedBudgetData(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // 4. getCategoryAnalytics
  describe('getCategoryAnalytics', () => {
    it('should return 401 if userId is missing', () => {
      res.locals.userId = undefined;

      controller.getCategoryAnalytics(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized access. Missing session token.',
      });
    });

    it('should return category analytics (200)', () => {
      model.getCategoryBreakdown.mockImplementation((userId, cb) => cb(null, { rows: [] }));

      controller.getCategoryAnalytics(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should default to an empty array when results has no rows', () => {
      model.getCategoryBreakdown.mockImplementation((userId, cb) => cb(null, null));

      controller.getCategoryAnalytics(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle database error and return 500', () => {
      model.getCategoryBreakdown.mockImplementation((userId, cb) =>
        cb(new Error('DB Error'), null),
      );

      controller.getCategoryAnalytics(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // 5. createAlertNotification
  describe('createAlertNotification', () => {
    it('should return 401 if userId is missing', () => {
      res.locals.userId = undefined;
      req.body = { message: 'Over budget', type: 'WARNING', title: 'Budget Alert' };

      controller.createAlertNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized access. Missing session token.',
      });
    });

    it('should return 400 if required fields are missing', () => {
      req.body = { message: 'Over budget' };

      controller.createAlertNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing required notification fields.' });
    });

    it('should handle model error and return 500', () => {
      req.body = { message: 'Over budget', type: 'WARNING', title: 'Budget Alert' };
      model.createBudgetNotification.mockImplementation((data, cb) =>
        cb(new Error('DB Error'), null),
      );

      controller.createAlertNotification(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });

    it('should create the notification successfully (201)', () => {
      req.body = { message: 'Over budget', type: 'WARNING', title: 'Budget Alert' };
      model.createBudgetNotification.mockImplementation((data, cb) => cb(null, { rows: [] }));

      controller.createAlertNotification(req, res, next);

      expect(model.createBudgetNotification).toHaveBeenCalledWith(
        {
          user_id: 1,
          message: 'Over budget',
          type: 'WARNING',
          title: 'Budget Alert',
        },
        expect.any(Function),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Budget breach notification logged successfully.',
      });
    });
  });
});
