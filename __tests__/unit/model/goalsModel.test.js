const model = require('../../../src/models/goalsModel');
const db = require('../../../src/services/db');

jest.mock('../../../src/services/db', () => ({
  query: jest.fn(),
}));

describe('goalsModel Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createGoal executes query', () => {
    const data = { userId: 1, title: 'Travel', target_amount: 1000, target_date: '2026-12-31' };
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [{ id: 1, ...data }] }));

    return new Promise((resolve) => {
      model.createGoal(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows[0].id).toBe(1);
        resolve();
      });
    });
  });

  test('getGoalsByUserId executes query', () => {
    db.query.mockImplementation((sql, params, cb) => cb(null, { rows: [] }));

    return new Promise((resolve) => {
      model.getGoalsByUserId(1, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows).toEqual([]);
        resolve();
      });
    });
  });

  test('updateGoalProgress executes query', () => {
    const data = { goal_id: 1, userId: 1, amount: 200 };
    db.query.mockImplementation((sql, params, cb) =>
      cb(null, { rows: [{ id: 1, current_amount: 200 }] }),
    );

    return new Promise((resolve) => {
      model.updateGoalProgress(data, (err, res) => {
        expect(err).toBeNull();
        expect(res.rows[0].current_amount).toBe(200);
        resolve();
      });
    });
  });
});
