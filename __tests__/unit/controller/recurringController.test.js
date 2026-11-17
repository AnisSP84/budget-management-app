jest.mock('../../../src/models/recurringModel', () => ({
  insertRecurringTransaction: jest.fn(),
  selectAllRecurringTransactions: jest.fn(),
  selectRecurringTransactionById: jest.fn(),
  updateRecurringTransactionById: jest.fn(),
  deleteRecurringTransactionById: jest.fn(),
  getDueRecurring: jest.fn(),
  createFromRecurring: jest.fn(),
  updateNextDate: jest.fn(),
}));

const controller = require('../../../src/controllers/recurringController');
const model = require('../../../src/models/recurringModel');

let req;
let res;

beforeEach(() => {
  jest.clearAllMocks();

  req = {
    body: {},
    params: {},
    query: {},
  };

  res = {
    locals: {
      userId: 1,
    },
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
});

describe('recurringController.js - getRecurringTransactions', () => {
  test('should return all recuriring transactions', () => {
    model.selectAllRecurringTransactions.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            amount: 20,
          },
        ],
      });
    });

    controller.getRecurringTransactions(req, res);

    expect(model.selectAllRecurringTransactions).toHaveBeenCalledWith(
      {
        user_id: 1,
      },
      expect.any(Function),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      rows: [
        {
          recurring_id: 1,
          amount: 20,
        },
      ],
      count: 1,
    });
  });

  test('should return empty recurring transactions', () => {
    model.selectAllRecurringTransactions.mockImplementation((data, callback) => {
      callback(null, {
        rows: [],
      });
    });

    controller.getRecurringTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      rows: [],
      count: 0,
    });
  });

  test('should return 500 when database fails', () => {
    model.selectAllRecurringTransactions.mockImplementation((data, callback) => {
      callback(new Error('Database failed'));
    });

    controller.getRecurringTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Database error while fetching recurring transactions',
      error: 'Database failed',
    });
  });
});

describe('recurringController.js - createRecurringTransaction', () => {
  test('should creste recurring transaction successfully', () => {
    req.body = {
      category_id: 1,
      amount: 20,
      description: 'Netflix',
      frequency: 'Monthly',
      next_date: '2026-08-01',
    };

    model.insertRecurringTransaction.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
          },
        ],
      });
    });

    controller.createRecurringTransaction(req, res);

    expect(model.insertRecurringTransaction).toHaveBeenCalledWith(
      {
        user_id: 1,
        category_id: 1,
        amount: 20,
        description: 'Netflix',
        frequency: 'Monthly',
        next_date: '2026-08-01',
        end_date: null,
      },
      expect.any(Function),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Recurring transaction created successfully',
      recurringTransaction: {
        recurring_id: 1,
      },
    });
  });

  test('should return 400 when required fields are missing', () => {
    req.body = {};

    controller.createRecurringTransaction(req, res);

    expect(model.insertRecurringTransaction).not.toHaveBeenCalledWith();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Missing requires fields',
    });
  });

  test('should return 400 when frequency is invalid', () => {
    req.body = {
      category_id: 1,
      amount: 20,
      frequency: 'Invalid',
      next_date: '2026-08-01',
    };

    controller.createRecurringTransaction(req, res);

    expect(model.insertRecurringTransaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Frequency must be Daily, Weekly, Monthly or Yearly',
    });
  });

  test('should return 500 when databse fails', () => {
    req.body = {
      category_id: 1,
      amount: 20,
      frequency: 'Monthly',
      next_date: '2026-08-01',
    };

    model.insertRecurringTransaction.mockImplementation((data, callback) => {
      callback(new Error('Database Error'));
    });

    controller.createRecurringTransaction(req, res);

    expect(model.insertRecurringTransaction).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('recurringTransaction.js - getRecurringTransactionById', () => {
  test('should return recurring transaction successfully', () => {
    req.params.id = 1;

    model.selectRecurringTransactionById.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            amount: 20,
            frequency: 'Monthly',
          },
        ],
      });
    });

    controller.getRecurringTransactionById(req, res);

    expect(model.selectRecurringTransactionById).toHaveBeenCalledWith(
      {
        recurring_id: 1,
        user_id: 1,
      },
      expect.any(Function),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      recurring_id: 1,
      amount: 20,
      frequency: 'Monthly',
    });
  });

  test('should return 404 when recurring transaction not found', () => {
    req.params.id = 999;

    model.selectRecurringTransactionById.mockImplementation((data, callback) => {
      callback(null, {
        rows: [],
      });
    });

    controller.getRecurringTransactionById(req, res);

    expect(model.selectRecurringTransactionById).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Recurring transaction not found',
    });
  });

  test('should return 500 when database fails', () => {
    req.params.id = 1;

    model.selectRecurringTransactionById.mockImplementation((data, callback) => {
      callback(new Error('Database failed'));
    });

    controller.getRecurringTransactionById(req, res);

    expect(model.selectRecurringTransactionById).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });
});

describe('recurringController.js - updateRecurringTransaction', () => {
  test('should update recurring transaction successfully', () => {
    req.params.id = 1;

    req.body = {
      category_id: 1,
      amount: 30,
      description: 'Spotify',
      frequency: 'Monthly',
      next_date: '2026-09-01',
      end_date: null,
      is_active: true,
    };

    model.updateRecurringTransactionById.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
          },
        ],
      });
    });

    controller.updateRecurringTransaction(req, res);
    expect(model.updateRecurringTransactionById).toHaveBeenCalledWith(
      {
        recurring_id: 1,
        user_id: 1,
        category_id: 1,
        amount: 30,
        description: 'Spotify',
        frequency: 'Monthly',
        next_date: '2026-09-01',
        end_date: null,
        is_active: true,
      },
      expect.any(Function),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Recurring transaction updated successfully',
      recurringTransaction: {
        recurring_id: 1,
      },
    });
  });

  test('should return 400 when category_id is missing', () => {
    req.params.id = 1;

    req.body = {
      amount: 20,
      frequency: 'Monthly',
      next_date: '2026-08-01',
    };

    controller.updateRecurringTransaction(req, res);

    expect(model.updateRecurringTransactionById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Missing required field: category_id',
    });
  });

  test('should return 400 when amount is missing', () => {
    req.params.id = 1;

    req.body = {
      category_id: 1,
      frequency: 'Monthly',
      next_date: '2026-08-01',
    };

    controller.updateRecurringTransaction(req, res);

    expect(model.updateRecurringTransactionById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Missing required field: amount',
    });
  });

  test('should return 400 when frequency is invalid', () => {
    req.params.id = 1;

    req.body = {
      category_id: 1,
      amount: 20,
      frequency: 'Invalid',
      next_date: '2026-08-01',
    };

    controller.updateRecurringTransaction(req, res);

    expect(model.updateRecurringTransactionById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid frequency. Must be one of: Daily, Weekly, Monthly, Yearly',
    });
  });

  test('should return 500 when database fails', () => {
    req.params.id = 1;

    req.body = {
      category_id: 1,
      amount: 20,
      description: 'Netflix',
      frequency: 'Monthly',
      next_date: '2026-08-01',
      end_date: null,
      is_active: true,
    };

    model.updateRecurringTransactionById.mockImplementation((data, callback) => {
      callback(new Error('Database failed'));
    });

    controller.updateRecurringTransaction(req, res);

    expect(model.updateRecurringTransactionById).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Database error while updating recurring transaction',
      error: 'Database failed',
    });
  });

  test('should return 404 when recurring transaction not found', () => {
    req.params.id = 999;

    req.body = {
      category_id: 1,
      amount: 20,
      description: 'Netflix',
      frequency: 'Monthly',
      next_date: '2026-08-01',
      end_date: null,
      is_active: true,
    };

    model.updateRecurringTransactionById.mockImplementation((data, callback) => {
      callback(null, {
        rows: [],
      });
    });

    controller.updateRecurringTransaction(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Recurring transaction not found',
    });
  });
});

describe('recurringCobtroller.js - deleteRecurringTransaction', () => {
  test('should delete recurring transaction successfully', () => {
    req.params.id = 1;

    model.deleteRecurringTransactionById.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
          },
        ],
      });
    });

    controller.deleteRecurringTransaction(req, res);

    expect(model.deleteRecurringTransactionById).toHaveBeenCalledWith(
      {
        recurring_id: 1,
        user_id: 1,
      },
      expect.any(Function),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Recurring transaction deleted successfully',
      deletedTransaction: {
        recurring_id: 1,
      },
    });
  });

  test('should return 404 when recurring transaction not found', () => {
    req.params.id = 999;

    model.deleteRecurringTransactionById.mockImplementation((data, callback) => {
      callback(null, {
        rows: [],
      });
    });

    controller.deleteRecurringTransaction(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Recurring transaction not found',
    });
  });

  test('should return 500 when databse fails', () => {
    req.params.id = 1;

    model.deleteRecurringTransactionById.mockImplementation((data, callback) => {
      callback(new Error('Database failed'));
    });

    controller.deleteRecurringTransaction(req, res);

    expect(model.deleteRecurringTransactionById).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Database error while deleting recurring transaction',
      error: 'Database failed',
    });
  });
});

describe('recurringController.js - processRecurringTransactions', () => {
  test('should return nothing to process', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [],
      });
    });

    controller.processRecurringTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Nothing to process',
    });
  });

  test('should process future recurring transaction', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            next_date: '2099-01-01',
            end_date: null,
            frequency: 'Monthly',
          },
        ],
      });
    });

    model.updateNextDate.mockImplementation((id, nextDate, callback) => {
      callback(null);
    });

    controller.processRecurringTransactions(req, res);

    expect(model.updateNextDate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Recurring transactions processed successfully',
      processed: 1,
    });
  });

  test('should return 500 when getDueRecurring fails', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(new Error('Database Error'));
    });

    controller.processRecurringTransactions(req, res);

    expect(model.getDueRecurring).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('should process expired recurring transaction', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            next_date: '2020-01-03',
            end_date: '2020-01-02',
            frequency: 'Monthly',
          },
        ],
      });
    });

    model.deleteRecurringTransactionById.mockImplementation((data, callback) => {
      callback(null);
    });

    controller.processRecurringTransactions(req, res);

    expect(model.deleteRecurringTransactionById).toHaveBeenCalled();
  });

  test('should create transaction from recurring', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 25,
            description: 'Netflix',
            frequency: 'Yearly',
            next_date: '2026-08-01',
            end_date: null,
          },
        ],
      });
    });

    model.createFromRecurring.mockImplementation((data, callback) => {
      callback(null);
    });

    model.updateNextDate.mockImplementation((id, nextDate, callback) => {
      callback(null);
    });

    controller.processRecurringTransactions(req, res);

    expect(model.createFromRecurring).toHaveBeenCalled();
    expect(model.updateNextDate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Recurring transactions processed successfully',
      processed: 1,
    });
  });

  test('should return 500 when createFromRecurring fails', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 25,
            description: 'Netflix',
            frequency: 'Yearly',
            next_date: '2026-08-01',
            end_date: null,
          },
        ],
      });
    });

    model.createFromRecurring.mockImplementation((data, callback) => {
      callback(new Error('Insert Error'));
    });

    controller.processRecurringTransactions(req, res);

    expect(model.createFromRecurring).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('should return 500 when updateNextDate fails', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 20,
            description: 'Netflix',
            frequency: 'Monthly',
            next_date: '2099-01-01',
            end_date: null,
          },
        ],
      });
    });

    model.updateNextDate.mockImplementation((id, nextDate, callback) => {
      callback(new Error('Update Error'));
    });

    controller.processRecurringTransactions(req, res);

    expect(model.updateNextDate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('should return 500 when deleteRecurringTransactionById fails', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 20,
            description: 'Netflix',
            frequency: 'Monthly',
            next_date: '2020-01-03',
            end_date: '2020-01-02',
          },
        ],
      });
    });

    model.deleteRecurringTransactionById.mockImplementation((data, callback) => {
      callback(new Error('Delete Error'));
    });

    controller.processRecurringTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('should continue processing after createFromRecurring succeeds', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 10,
            description: 'Netflix',
            frequency: 'Daily',
            next_date: '2026-08-01',
            end_date: null,
          },
        ],
      });
    });

    model.createFromRecurring.mockImplementation((data, callback) => {
      callback(null);
    });

    model.updateNextDate.mockImplementation((id, date, callback) => {
      callback(null);
    });

    controller.processRecurringTransactions(req, res);

    expect(model.createFromRecurring).toHaveBeenCalled();
    expect(model.updateNextDate).toHaveBeenCalled();
  });

  test('should process daily recurring transaction', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 10,
            description: 'Coffee',
            frequency: 'Daily',
            next_date: '2026-08-01',
            end_date: null,
          },
        ],
      });
    });

    model.createFromRecurring.mockImplementation((data, callback) => {
      callback(null);
    });

    model.updateNextDate.mockImplementation((id, date, callback) => {
      callback(null);
    });

    controller.processRecurringTransactions(req, res);

    expect(model.createFromRecurring).toHaveBeenCalled();
    expect(model.updateNextDate).toHaveBeenCalled();
  });

  test('should process weekly recurring transaction', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 10,
            description: 'Gym',
            frequency: 'Weekly',
            next_date: '2026-08-01',
            end_date: null,
          },
        ],
      });
    });

    model.createFromRecurring.mockImplementation((data, callback) => {
      callback(null);
    });

    model.updateNextDate.mockImplementation((id, date, callback) => {
      callback(null);
    });

    controller.processRecurringTransactions(req, res);

    expect(model.createFromRecurring).toHaveBeenCalled();
    expect(model.updateNextDate).toHaveBeenCalled();
  });

  test('should process monthly recurring transaction', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 10,
            description: 'Rent',
            frequency: 'Monthly',
            next_date: '2026-08-01',
            end_date: null,
          },
        ],
      });
    });

    model.createFromRecurring.mockImplementation((data, callback) => {
      callback(null);
    });

    model.updateNextDate.mockImplementation((id, date, callback) => {
      callback(null);
    });

    controller.processRecurringTransactions(req, res);

    expect(model.createFromRecurring).toHaveBeenCalled();
    expect(model.updateNextDate).toHaveBeenCalled();
  });

  test('should process yearly recurring transaction', () => {
    model.getDueRecurring.mockImplementation((callback) => {
      callback(null, {
        rows: [
          {
            recurring_id: 1,
            user_id: 1,
            category_id: 1,
            amount: 10,
            description: 'Insurance',
            frequency: 'Yearly',
            next_date: '2026-08-01',
            end_date: null,
          },
        ],
      });
    });

    model.createFromRecurring.mockImplementation((data, callback) => {
      callback(null);
    });

    model.updateNextDate.mockImplementation((id, date, callback) => {
      callback(null);
    });

    controller.processRecurringTransactions(req, res);

    expect(model.createFromRecurring).toHaveBeenCalled();
    expect(model.updateNextDate).toHaveBeenCalled();
  });
});
