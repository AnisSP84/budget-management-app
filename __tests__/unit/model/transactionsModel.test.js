const model = require('../../../src/models/transactionsModel');
const db = require('../../../src/services/db');

jest.mock('../../../src/services/db', () => ({
  query: jest.fn(),
}));

describe('transactionsModel Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('insertSingle executes query', () => {
    const data = {
      userId: 1,
      category_id: 2,
      description: 'Food',
      amount: 10,
      transaction_date: '2026-08-01',
    };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [{ id: 1, ...data }] }));

    return new Promise((resolve) => {
      model.insertSingle(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows[0].id).toBe(1);
        resolve();
      });
    });
  });

  test('selectAllByUserId executes query', () => {
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [] }));

    return new Promise((resolve) => {
      model.selectAllByUserId(1, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows).toEqual([]);
        resolve();
      });
    });
  });

  test('updateById executes query', () => {
    const data = { id: 1, userId: 1, category_id: 2, description: 'Lunch', amount: 12 };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rowCount: 1 }));

    return new Promise((resolve) => {
      model.updateById(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rowCount).toBe(1);
        resolve();
      });
    });
  });

  test('deleteById executes query', () => {
    const data = { id: 1, userId: 1 };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rowCount: 1 }));

    return new Promise((resolve) => {
      model.deleteById(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rowCount).toBe(1);
        resolve();
      });
    });
  });

  test('deleteBulkByIds executes query', () => {
    const data = { ids: [1, 2], userId: 1 };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rowCount: 2 }));

    return new Promise((resolve) => {
      model.deleteBulkByIds(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rowCount).toBe(2);
        resolve();
      });
    });
  });

  test('getBudgetByUserId executes query', () => {
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [{ amount: 1000 }] }));

    return new Promise((resolve) => {
      model.getBudgetByUserId(1, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows[0].amount).toBe(1000);
        resolve();
      });
    });
  });

  test('upsertBudget executes query', () => {
    const data = { userId: 1, amount: 1500 };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rowCount: 1 }));

    return new Promise((resolve) => {
      model.upsertBudget(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rowCount).toBe(1);
        resolve();
      });
    });
  });
});
