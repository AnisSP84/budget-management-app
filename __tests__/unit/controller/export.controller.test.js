const controller = require('../../../src/controllers/exportController');
const budgetModel = require('../../../src/models/budgetModel');

jest.mock('../../../src/models/budgetModel');

describe('budgetController Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};

    res = {
      locals: {
        userId: 1,
      },
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  // =====================================================
  // exportFinancialSummaryCSV
  // =====================================================
  describe('exportFinancialSummaryCSV', () => {
    it('should return 401 when userId is missing', () => {
      res.locals.userId = undefined;

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized access. Missing session token.',
      });
    });

    it('should export CSV successfully with categories', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              budget_limit: 1000,
              total_spent: 300,
            },
          ],
        });
      });

      budgetModel.getCategoryBreakdown.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              category_name: 'Food',
              total_amount: 150,
            },
          ],
        });
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(budgetModel.getCombinedBudgetData).toHaveBeenCalledWith(1, expect.any(Function));

      expect(budgetModel.getCategoryBreakdown).toHaveBeenCalledWith(1, expect.any(Function));

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="financial_summary.csv"',
      );

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('Monthly Budget Limit,1000.00'),
      );

      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('"Food",150.00'));
    });

    it('should use default summary values when no summary exists', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [],
        });
      });

      budgetModel.getCategoryBreakdown.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [],
        });
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Monthly Budget Limit,0.00'));

      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('No recorded expenses for this month,0.00'),
      );
    });

    it('should handle null summaryResults', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(null, null);
      });

      budgetModel.getCategoryBreakdown.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [],
        });
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Remaining Budget,0.00'));
    });

    it('should handle null category results', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              budget_limit: 500,
              total_spent: 100,
            },
          ],
        });
      });

      budgetModel.getCategoryBreakdown.mockImplementation((userId, callback) => {
        callback(null, null);
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.send).toHaveBeenCalledWith(
        expect.stringContaining('No recorded expenses for this month,0.00'),
      );
    });

    it('should return 500 when fetching summary fails', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(new Error('Database Error'), null);
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error.',
      });
    });

    it('should return 500 when fetching categories fails', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              budget_limit: 500,
              total_spent: 100,
            },
          ],
        });
      });

      budgetModel.getCategoryBreakdown.mockImplementation((userId, callback) => {
        callback(new Error('Database Error'), null);
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error.',
      });
    });

    it('should escape quotes in category names', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              budget_limit: 500,
              total_spent: 100,
            },
          ],
        });
      });

      budgetModel.getCategoryBreakdown.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              category_name: 'Food "Dining"',
              total_amount: 50,
            },
          ],
        });
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('"Food ""Dining""",50.00'));
    });

    it('should use Uncategorized when category_name is missing', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              budget_limit: 500,
              total_spent: 100,
            },
          ],
        });
      });

      budgetModel.getCategoryBreakdown.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              category_name: null,
              total_amount: 75,
            },
          ],
        });
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Uncategorized,75.00'));
    });

    it('should handle missing total_amount by defaulting to 0.00', () => {
      budgetModel.getCombinedBudgetData.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              budget_limit: 500,
              total_spent: 100,
            },
          ],
        });
      });

      budgetModel.getCategoryBreakdown.mockImplementation((userId, callback) => {
        callback(null, {
          rows: [
            {
              category_name: 'Transport',
            },
          ],
        });
      });

      controller.exportFinancialSummaryCSV(req, res, next);

      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('"Transport",0.00'));
    });
  });
});
