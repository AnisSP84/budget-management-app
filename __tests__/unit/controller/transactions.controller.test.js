const controller = require('../../../src/controllers/transactionsController');
const model = require('../../../src/models/transactionsModel');

jest.mock('../../../src/models/transactionsModel');

describe('transactionsController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
    };
    res = {
      locals: { userId: 1 },
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  // ── 1. createTransaction ─────────────────────────────────
  describe('createTransaction', () => {
    it('should return 401 if userId is missing', () => {
      res.locals.userId = undefined;
      controller.createTransaction(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User ID missing from token. Please re-login.',
      });
    });

    it('should create transaction successfully (201)', () => {
      req.body = {
        category_id: 2,
        description: 'Lunch',
        amount: 15,
        transaction_date: '2026-08-01',
      };
      const mockCreated = { id: 10, ...req.body };

      model.insertSingle.mockImplementation((data, callback) => {
        callback(null, { rows: [mockCreated] });
      });

      controller.createTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockCreated);
    });

    it('should return 500 on database error', () => {
      req.body = { category_id: 2, description: 'Lunch', amount: 15 };

      model.insertSingle.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.createTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
    });
  });

  // ── 2. getAllTransactions ────────────────────────────────
  describe('getAllTransactions', () => {
    it('should return all transactions (200)', () => {
      const mockList = [
        { id: 1, description: 'Coffee' },
        { id: 2, description: 'Book' },
      ];

      model.selectAllByUserId.mockImplementation((userId, callback) => {
        callback(null, { rows: mockList }, null);
      });

      controller.getAllTransactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockList);
    });

    it('should return 500 on model error', () => {
      model.selectAllByUserId.mockImplementation((userId, callback) => {
        callback(new Error('DB Error'), null, null);
      });

      controller.getAllTransactions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });
  });

  // ── 3. updateTransaction ─────────────────────────────────
  describe('updateTransaction', () => {
    it('should return 400 if required body parameters are missing', () => {
      req.body = { description: 'Missing amount and category' };
      controller.updateTransaction(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing required data.' });
    });

    it('should return 204 on successful update', () => {
      req.params.id = 5;
      req.body = { description: 'Dinner', amount: 50, category_id: 1 };

      model.updateById.mockImplementation((data, callback) => {
        callback(null, { rowCount: 1 });
      });

      controller.updateTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 if transaction is not found', () => {
      req.params.id = 999;
      req.body = { description: 'Dinner', amount: 50, category_id: 1 };

      model.updateById.mockImplementation((data, callback) => {
        callback(null, { rowCount: 0 });
      });

      controller.updateTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Transaction not found.' });
    });

    it('should return 500 on database error', () => {
      req.params.id = 5;
      req.body = { description: 'Dinner', amount: 50, category_id: 1 };

      model.updateById.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.updateTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });
  });

  // ── 4. deleteTransaction ─────────────────────────────────
  describe('deleteTransaction', () => {
    it('should return 204 on successful single delete', () => {
      req.params.id = 3;

      model.deleteById.mockImplementation((data, callback) => {
        callback(null, { rowCount: 1 });
      });

      controller.deleteTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 if transaction does not exist', () => {
      req.params.id = 999;

      model.deleteById.mockImplementation((data, callback) => {
        callback(null, { rowCount: 0 });
      });

      controller.deleteTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Transaction not found.' });
    });

    it('should return 500 on delete database error', () => {
      req.params.id = 3;

      model.deleteById.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.deleteTransaction(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });
  });

  // ── 5. deleteBulk ────────────────────────────────────────
  describe('deleteBulk', () => {
    it('should return 400 if ids array is missing or empty', () => {
      req.body = { ids: [] };
      controller.deleteBulk(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'An array of transaction IDs is required.',
      });
    });

    it('should return 200 on successful bulk delete', () => {
      req.body = { ids: [1, 2, 3] };

      model.deleteBulkByIds.mockImplementation((data, callback) => {
        callback(null, { rowCount: 3 });
      });

      controller.deleteBulk(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Transactions deleted successfully.',
        deletedCount: 3,
      });
    });

    it('should return 500 on database bulk delete error', () => {
      req.body = { ids: [1, 2] };

      model.deleteBulkByIds.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.deleteBulk(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });
  });

  // ── 6. getUserBudget & updateBudget ─────────────────────
  describe('getUserBudget & updateBudget', () => {
    it('should fetch user budget successfully (200)', () => {
      model.getBudgetByUserId.mockImplementation((userId, callback) => {
        callback(null, { rows: [{ amount: 1200 }] });
      });

      controller.getUserBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ budget_limit: 1200 });
    });

    it('should default budget to 0 if no row is returned', () => {
      model.getBudgetByUserId.mockImplementation((userId, callback) => {
        callback(null, { rows: [] });
      });

      controller.getUserBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ budget_limit: 0 });
    });

    it('should return 500 on error fetching budget', () => {
      model.getBudgetByUserId.mockImplementation((userId, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.getUserBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });

    it('should return 400 in updateBudget if amount is missing', () => {
      req.body = {};
      controller.updateBudget(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Amount is required.' });
    });

    it('should update budget successfully (200)', () => {
      req.body = { amount: 1500 };

      model.upsertBudget.mockImplementation((data, callback) => {
        callback(null, { rowCount: 1 });
      });

      controller.updateBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Budget updated successfully.' });
    });

    it('should return 500 on database error during budget update', () => {
      req.body = { amount: 1500 };

      model.upsertBudget.mockImplementation((data, callback) => {
        callback(new Error('DB Error'), null);
      });

      controller.updateBudget(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error.' });
    });
  });
});
