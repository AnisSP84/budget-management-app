jest.mock('../../../src/services/db', () => ({
  query: jest.fn(),
}));

const pool = require('../../../src/services/db');
const model = require('../../../src/models/recurringModel');

let recurringId = 1;

beforeEach(() => {
  jest.clearAllMocks();

  pool.query.mockImplementation((sql, values, callback) => {
    //handle pool.query(SQL, callback)
    if (typeof values === 'function') {
      callback = values;
    }

    callback(null, {
      rows: [
        {
          recurring_id: recurringId,
          user_id: 1,
          category_id: 1,
          amount: 30,
          description: 'Spotify',
          frequency: 'Monthly',
          next_date: '2026-09-01',
          end_date: null,
          is_active: true,
        },
      ],
    });
  });
});

describe('Recurring Model', () => {
  test('insert recurring transaction', (done) => {
    const data = {
      user_id: 1,
      category_id: 1,
      amount: 20,
      description: 'Netflix',
      frequency: 'Monthly',
      next_date: '2026-08-01',
      end_date: null,
      is_active: true,
    };

    model.insertRecurringTransaction(data, (err, result) => {
      expect(err).toBeNull();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].recurring_id).toBe(1);
      done();
    });
  });

  test('select all recurring transactions', (done) => {
    model.selectAllRecurringTransactions({ user_id: 1 }, (err, result) => {
      expect(err).toBeNull();
      expect(Array.isArray(result.rows)).toBe(true);
      done();
    });
  });

  test('select recurring transaction by id', (done) => {
    model.selectRecurringTransactionById(
      { recurring_id: recurringId, user_id: 1 },
      (err, result) => {
        expect(err).toBeNull();
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].recurring_id).toBe(recurringId);

        done();
      },
    );
  });

  test('update recurring transaction by id', (done) => {
    const data = {
      recurring_id: recurringId,
      user_id: 1,
      category_id: 1,
      amount: 30,
      description: 'Spotify',
      frequency: 'Monthly',
      next_date: '2026-09-01',
      end_date: null,
      is_active: true,
    };

    model.updateRecurringTransactionById(data, (err, result) => {
      expect(err).toBeNull();
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].amount).toBe(30);
      done();
    });
  });

  test('get due recurring', (done) => {
    model.getDueRecurring((err, result) => {
      expect(err).toBeNull();
      expect(Array.isArray(result.rows)).toBe(true);
      done();
    });
  });

  test('update next date', (done) => {
    model.updateNextDate(recurringId, '2026-10-01', (err) => {
      expect(err).toBeNull();
      expect(pool.query).toHaveBeenCalled();
      done();
    });
  });

  test('create from recurring', (done) => {
    const recurring = {
      user_id: 1,
      category_id: 1,
      amount: 30,
      description: 'Spotify',
    };

    model.createFromRecurring(recurring, (err, result) => {
      expect(err).toBeNull();
      expect(result.rows.length).toBe(1);
      done();
    });
  });

  test('delete recurring transaction by id', (done) => {
    model.deleteRecurringTransactionById(
      {
        recurring_id: recurringId,
        user_id: 1,
      },
      (err, result) => {
        expect(err).toBeNull();
        expect(result.rows.length).toBe(1);
        done();
      },
    );
  });
});
