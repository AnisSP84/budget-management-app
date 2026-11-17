const model = require('../../../src/models/reportModel');
const pool = require('../../../src/services/db');

jest.mock('../../../src/services/db', () => ({
  query: jest.fn(),
  end: jest.fn(),
}));

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Report Model.js', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectSummaryReport', () => {
    test.each([
      ['daily', "INTERVAL '1 day'"],
      ['weekly', "INTERVAL '7 day'"],
      ['monthly', "INTERVAL '30 day'"],
      ['yearly', "INTERVAL '1 year'"],
    ])('should query %s summary report', (period, interval, done) => {
      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, {
          rows: [{ period: '2026-08', total: 100 }],
        });
      });

      model.selectSummaryReport(
        {
          userId: 1,
          period,
        },
        (err, result) => {
          expect(err).toBeNull();
          expect(result.rows[0].total).toBe(100);

          expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('SUM(amount)'),
            [1],
            expect.any(Function),
          );

          done();
        },
      );
    });

    test('should return database error', (done) => {
      const error = new Error('Database Error');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      model.selectSummaryReport(
        {
          userId: 1,
          period: 'monthly',
        },
        (err, result) => {
          expect(err).toBe(error);
          expect(result).toBeNull();
          done();
        },
      );
    });

    test('should handle invalid period in selectSummaryReport', (done) => {
      pool.query.mockImplementation((sql, values, callback) => {
        expect(sql).toBe('');
        callback(null, { rows: [] });
      });

      model.selectSummaryReport(
        {
          userId: 1,
          period: 'invalid',
        },
        (err, result) => {
          expect(err).toBeNull();
          expect(result.rows).toEqual([]);
          done();
        },
      );
    });
  });

  describe('selectCategoryBreakdown', () => {
    test.each([
      ['daily', "INTERVAL '1 day'"],
      ['weekly', "INTERVAL '7 day'"],
      ['monthly', "INTERVAL '30 day'"],
      ['yearly', "INTERVAL '1 year'"],
    ])('should query %s category breakdown', (period, interval, done) => {
      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, {
          rows: [
            {
              category_name: 'Food',
              total: 200,
            },
          ],
        });
      });

      model.selectCategoryBreakdown(
        {
          userId: 1,
          period,
        },
        (err, result) => {
          expect(err).toBeNull();
          expect(result.rows[0].category_name).toBe('Food');
          expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('GROUP BY c.category_name'),
            [1],
            expect.any(Function),
          );

          done();
        },
      );
    });

    test('should return database error', (done) => {
      const error = new Error('Database Error');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      model.selectCategoryBreakdown(
        {
          userId: 1,
          period: 'monthly',
        },
        (err, result) => {
          expect(err).toBe(error);
          expect(result).toBeNull();
          done();
        },
      );
    });

    test('should handle invalid period in selectCategoryBreakdown', (done) => {
      pool.query.mockImplementation((sql, values, callback) => {
        expect(sql).toContain('WHERE t.user_id = $1');
        expect(sql).not.toContain('INTERVAL');
        callback(null, { rows: [] });
      });

      model.selectCategoryBreakdown(
        {
          userId: 1,
          period: 'invalid',
        },
        (err, result) => {
          expect(err).toBeNull();
          expect(result.rows).toEqual([]);
          done();
        },
      );
    });
  });

  describe('selectDashboardSummary', () => {
    test.each([
      ['daily', "INTERVAL '1 day'"],
      ['weekly', "INTERVAL '7 day'"],
      ['monthly', "INTERVAL '30 day'"],
      ['yearly', "INTERVAL '1 year'"],
    ])('should query %s dashboard summary', (period, interval, done) => {
      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, {
          rows: [
            {
              total_income: 5000,
              total_spending: 2000,
            },
          ],
        });
      });

      model.selectDashboardSummary(
        {
          userId: 1,
          period,
        },
        (err, result) => {
          expect(err).toBeNull();
          expect(result.rows[0].total_income).toBe(5000);
          expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('COALESCE'),
            [1],
            expect.any(Function),
          );

          done();
        },
      );
    });

    test('should return database error', (done) => {
      const error = new Error('Database Error');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      model.selectDashboardSummary(
        {
          userId: 1,
          period: 'monthly',
        },
        (err, result) => {
          expect(err).toBe(error);
          expect(result).toBeNull();
          done();
        },
      );
    });

    test('should handle invalid period in selectDashboardSummary', (done) => {
      pool.query.mockImplementation((sql, values, callback) => {
        expect(sql).toContain('WHERE t.user_id = $1');
        expect(sql).not.toContain('INTERVAL');
        callback(null, { rows: [] });
      });

      model.selectDashboardSummary(
        {
          userId: 1,
          period: 'invalid',
        },
        (err, result) => {
          expect(err).toBeNull();
          expect(result.rows).toEqual([]);
          done();
        },
      );
    });
  });

  describe('selectExportTransaction', () => {
    test('should query export transactions', (done) => {
      pool.query.mockImplementation((sql, values, callback) => {
        callback(null, {
          rows: [
            {
              transaction_date: '2026-08-01',
              category_name: 'Food',
              amount: 15,
              description: 'Lunch',
            },
          ],
        });
      });

      model.selectExportTransactions(
        {
          userId: 1,
        },
        (err, result) => {
          expect(err).toBeNull();
          expect(result.rows[0].category_name).toBe('Food');
          expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('SELECT t.transaction_date'),
            [1],
            expect.any(Function),
          );
          done();
        },
      );
    });

    test('should return database error', (done) => {
      const error = new Error('Databse Error');

      pool.query.mockImplementation((sql, values, callback) => {
        callback(error, null);
      });

      model.selectExportTransactions(
        {
          userID: 1,
        },
        (err, result) => {
          expect(err).toBe(error);
          expect(result).toBeNull();
          done();
        },
      );
    });
  });
});
