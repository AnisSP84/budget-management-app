const model = require('../models/reportModel');

// ============================
// Summary Report
// ============================
module.exports.getSummaryReport = (req, res) => {
  const period = req.query.period || 'monthly';

  const userId = res.locals.userId;

  const allowedPeriods = ['daily', 'weekly', 'monthly', 'yearly'];

  if (!allowedPeriods.includes(period)) {
    return res.status(400).json({
      message: 'Invalid period type.',
    });
  }

  // ONLY reject undefined/null
  if (userId === undefined || userId === null) {
    return res.status(400).json({
      message: 'Missing user id.',
    });
  }

  model.selectSummaryReport({ userId, period }, (err, results) => {
    if (err) {
      console.error('SQL ERROR:', err);

      return res.status(500).json({
        message: 'Internal server error',
      });
    }

    res.json({
      success: true,
      report: results.rows,
    });
  });
};

// ============================
// Category Breakdown
// ============================
module.exports.getCategoryBreakdown = (req, res) => {
  const period = req.query.period || 'monthly';
  // FIX
  const userId = Number(res.locals.userId);

  const allowedPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
  if (!allowedPeriods.includes(period)) {
    return res.status(400).json({ message: 'Invalid period type.' });
  }

  model.selectCategoryBreakdown({ userId, period }, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json({
      success: true,
      report: results.rows,
    });
  });
};

// ============================
// Dashboard Summary
// ============================
module.exports.getDashboardSummary = (req, res) => {
  const period = req.query.period || 'monthly';
  const userId = res.locals.userId;

  model.selectDashboardSummary({ userId, period }, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!results.rows.length) {
      return res.json({
        total_income: 0,
        total_spending: 0,
      });
    }

    res.json(results.rows[0]);
  });
};

// ============================
// CSV Export
// ============================
module.exports.exportCSV = (req, res) => {
  const period = req.query.period || 'monthly';
  const userId = res.locals.userId;

  model.selectExportTransactions({ userId, period }, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    let csv = 'Date,Category,Amount,Description\n';

    results.rows.forEach((item) => {
      csv += `${item.transaction_date},${item.category_name},${item.amount},"${item.description || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report_${period}.csv`);

    res.send(csv);
  });
};
