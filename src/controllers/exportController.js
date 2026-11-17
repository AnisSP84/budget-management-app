const budgetModel = require('../models/budgetModel');

module.exports.exportFinancialSummaryCSV = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  const userId = res.locals.userId;

  // 1. Fetch combined budget data
  budgetModel.getCombinedBudgetData(userId, (summaryErr, summaryResults) => {
    if (summaryErr) {
      console.error('Error fetching summary for CSV:', summaryErr);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    const summary = (summaryResults && summaryResults.rows && summaryResults.rows[0]) || {
      budget_limit: 0,
      total_spent: 0,
    };

    const budgetLimit = parseFloat(summary.budget_limit || 0).toFixed(2);
    const totalSpent = parseFloat(summary.total_spent || 0).toFixed(2);
    const remaining = (budgetLimit - totalSpent).toFixed(2);

    // 2. Fetch category analytics breakdown
    budgetModel.getCategoryBreakdown(userId, (catErr, catResults) => {
      if (catErr) {
        console.error('Error fetching categories for CSV:', catErr);
        return res.status(500).json({ message: 'Internal server error.' });
      }

      const categories = (catResults && catResults.rows) || [];

      // 3. Construct CSV String
      let csvContent = '--- FINANCIAL SUMMARY REPORT ---\n';
      csvContent += `Generated Date,${new Date().toISOString().split('T')[0]}\n\n`;
      csvContent += 'Metric,Amount ($)\n';
      csvContent += `Monthly Budget Limit,${budgetLimit}\n`;
      csvContent += `Total Spent,${totalSpent}\n`;
      csvContent += `Remaining Budget,${remaining}\n\n`;

      csvContent += '--- EXPENSE BREAKDOWN BY CATEGORY ---\n';
      csvContent += 'Category Name,Total Amount ($)\n';

      if (categories.length === 0) {
        csvContent += 'No recorded expenses for this month,0.00\n';
      } else {
        categories.forEach((cat) => {
          const catName = cat.category_name
            ? `"${cat.category_name.replace(/"/g, '""')}"`
            : 'Uncategorized';
          const amount = parseFloat(cat.total_amount || 0).toFixed(2);
          csvContent += `${catName},${amount}\n`;
        });
      }

      // 4. Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="financial_summary.csv"');
      return res.status(200).send(csvContent);
    });
  });
};
