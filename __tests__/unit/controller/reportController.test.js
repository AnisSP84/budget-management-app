jest.mock('../../../src/models/reportModel', () => ({
  selectSummaryReport: jest.fn(),
  selectCategoryBreakdown: jest.fn(),
  selectBudgetComparison: jest.fn(),
  selectDashboardSummary: jest.fn(),
  selectExportTransactions: jest.fn(),
}));

const controller = require('../../../src/controllers/reportController');
const model = require('../../../src/models/reportModel');

let req;
let res;

beforeEach(() => {
  jest.clearAllMocks();

  req = {
    query: {},
  };

  res = {
    locals: {
      userId: 1,
    },
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn(),
    setHeader: jest.fn(),
  };
});

describe('reportController.js - getSummaryReport', () => {
  test('should return summary report successfully', () => {
    model.selectSummaryReport.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            period: '2026-08',
            total: 300,
          },
        ],
      });
    });

    controller.getSummaryReport(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      report: [
        {
          period: '2026-08',
          total: 300,
        },
      ],
    });
  });

  test('should return 400 when period is invalid', () => {
    req.query.period = 'abc';

    controller.getSummaryReport(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid period type.',
    });
  });

  test('Should return 400 when user id missing', () => {
    res.locals.userId = undefined;

    controller.getSummaryReport(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should return 500 when database fails', () => {
    model.selectSummaryReport.mockImplementation((data, callback) => {
      callback(new Error('Database Error'));
    });

    controller.getSummaryReport(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('reportController.js - getCategoryBreakdown', () => {
  test('should return category breakdown successfully', () => {
    model.selectCategoryBreakdown.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            category_name: 'Food',
            category_type: 'Expenses',
            total: 100,
          },
        ],
      });
    });

    controller.getCategoryBreakdown(req, res);

    expect(model.selectCategoryBreakdown).toHaveBeenCalledWith(
      {
        userId: 1,
        period: 'monthly',
      },
      expect.any(Function),
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      report: [
        {
          category_name: 'Food',
          category_type: 'Expenses',
          total: 100,
        },
      ],
    });
  });

  test('should return 400 when period is invalid', () => {
    req.query.period = 'wrong';

    controller.getCategoryBreakdown(req, res);

    expect(model.selectCategoryBreakdown).not.toHaveBeenCalledWith();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid period type.',
    });
  });

  test('should return 500 when database fails', () => {
    model.selectCategoryBreakdown.mockImplementation((data, callback) => {
      callback(new Error('Database Error'));
    });

    controller.getCategoryBreakdown(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });
});

describe('reportController.js - getDashboardSummary', () => {
  test('should return dashboard summary successfully', () => {
    model.selectDashboardSummary.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            total_income: 2000,
            total_spending: 1500,
          },
        ],
      });
    });

    controller.getDashboardSummary(req, res);

    expect(model.selectDashboardSummary).toHaveBeenCalledWith(
      {
        userId: 1,
        period: 'monthly',
      },
      expect.any(Function),
    );
    expect(res.json).toHaveBeenCalledWith({
      total_income: 2000,
      total_spending: 1500,
    });
  });

  test('should return 500 when database fails', () => {
    model.selectDashboardSummary.mockImplementation((data, callback) => {
      callback(new Error('Database Error'));
    });

    controller.getDashboardSummary(req, res);

    expect(model.selectDashboardSummary).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });

  test('should return undefined when dashboard summary has no rows', () => {
    model.selectDashboardSummary.mockImplementation((data, callback) => {
      callback(null, {
        rows: [],
      });
    });

    controller.getDashboardSummary(req, res);

    expect(res.json).toHaveBeenCalledWith({
      total_income: 0,
      total_spending: 0,
    });
  });
});

describe('reportController.js - exportCSV', () => {
  test('should export CSV successfully', () => {
    model.selectExportTransactions.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            transaction_date: '2026-08-01',
            category_name: 'Food',
            amount: 20,
            description: 'Lunch',
          },
        ],
      });
    });

    controller.exportCSV(req, res);

    expect(model.selectExportTransactions).toHaveBeenCalledWith(
      {
        userId: 1,
        period: 'monthly',
      },
      expect.any(Function),
    );

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename=report_monthly.csv',
    );
    expect(res.send).toHaveBeenCalledWith(
      'Date,Category,Amount,Description\n' + '2026-08-01,Food,20,"Lunch"\n',
    );
  });

  test('should return 500 when database fails', () => {
    model.selectExportTransactions.mockImplementation((data, callback) => {
      callback(new Error('Database Error'));
    });

    controller.exportCSV(req, res);

    expect(model.selectExportTransactions).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
    expect(res.send).not.toHaveBeenCalled();
  });

  test('should export CSV when description is empty', () => {
    model.selectExportTransactions.mockImplementation((data, callback) => {
      callback(null, {
        rows: [
          {
            transaction_date: '2026-08-01',
            category_name: 'Food',
            amount: 20,
            description: null,
          },
        ],
      });
    });

    controller.exportCSV(req, res);

    expect(res.send).toHaveBeenCalledWith(
      'Date,Category,Amount,Description\n' + '2026-08-01,Food,20,""\n',
    );
  });
});
