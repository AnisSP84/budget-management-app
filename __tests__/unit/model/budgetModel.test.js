const model = require('../../../src/models/budgetModel');
const db = require('../../../src/services/db');

jest.mock('../../../src/services/db', () => ({
  query: jest.fn(),
}));

describe('budgetModel Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('insertBudget executes query', () => {
    const data = { user_id: 1, category_id: 2, amount: 500, description: 'Test' };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [{ budget_id: 1 }] }));

    return new Promise((resolve) => {
      model.insertBudget(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows[0].budget_id).toBe(1);
        resolve();
      });
    });
  });

  test('insertBudget uses default values when optional fields are missing', () => {
    const data = { user_id: 1, amount: 500 };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [{ budget_id: 1 }] }));

    return new Promise((resolve) => {
      model.insertBudget(data, (err, responseData) => {
        expect(err).toBeNull();
        expect(db.query).toHaveBeenCalledWith(
          expect.any(String),
          [1, 1, 500, 'Main Monthly Budget'],
          expect.any(Function),
        );
        resolve();
      });
    });
  });

  test('updateBudgetByUserId executes query', () => {
    const data = { user_id: 1, amount: 500, description: 'Updated' };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rowCount: 1 }));

    return new Promise((resolve) => {
      model.updateBudgetByUserId(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rowCount).toBe(1);
        resolve();
      });
    });
  });

  test('upsertBudget updates budget if existing row exists', () => {
    const data = { user_id: 1, amount: 500 };
    db.query
      .mockImplementationOnce((sql, params, cb) => cb(null, { rows: [{ budget_id: 1 }] }))
      .mockImplementationOnce((sql, params, cb) => cb(null, { rowCount: 1 }));

    return new Promise((resolve) => {
      model.upsertBudget(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rowCount).toBe(1);
        resolve();
      });
    });
  });

  test('upsertBudget inserts budget if no row exists', () => {
    const data = { user_id: 1, amount: 500 };
    db.query
      .mockImplementationOnce((sql, params, cb) => cb(null, { rows: [] }))
      .mockImplementationOnce((sql, params, cb) => cb(null, { rows: [{ budget_id: 2 }] }));

    return new Promise((resolve) => {
      model.upsertBudget(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows[0].budget_id).toBe(2);
        resolve();
      });
    });
  });

  test('upsertBudget handles error on initial check', () => {
    const data = { user_id: 1, amount: 500 };
    db.query.mockImplementationOnce((sql, params, cb) => cb(new Error('DB Error'), null));

    return new Promise((resolve) => {
      model.upsertBudget(data, (err, res) => {
        expect(err).not.toBeNull();
        expect(res).toBeUndefined();
        resolve();
      });
    });
  });

  test('getBudgetByUserId executes query', () => {
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [{ amount: 500 }] }));

    return new Promise((resolve) => {
      model.getBudgetByUserId(1, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows[0].amount).toBe(500);
        resolve();
      });
    });
  });

  test('getCombinedBudgetData executes query successfully', () => {
    const mockRow = { budget_limit: '1000.00', total_spent: '250.00' };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [mockRow] }));

    return new Promise((resolve) => {
      model.getCombinedBudgetData(1, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows[0]).toEqual(mockRow);
        resolve();
      });
    });
  });

  test('getCategoryBreakdown executes query successfully', () => {
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [] }));

    return new Promise((resolve) => {
      model.getCategoryBreakdown(1, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows).toEqual([]);
        resolve();
      });
    });
  });

  test('createBudgetNotification executes query', () => {
    const data = { user_id: 1, message: 'Warning', type: 'budget', title: 'Alert' };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rowCount: 1 }));

    return new Promise((resolve) => {
      model.createBudgetNotification(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rowCount).toBe(1);
        resolve();
      });
    });
  });
});
