const pool = require('../services/db');

// ============================
// Summary Report
// ============================
module.exports.selectSummaryReport = (data, callback) => {
  const userId = data.userId;
  const period = data.period;
  console.log(userId);
  let sql = '';

  // DAILY
  if (period === 'daily') {
    sql = `
      SELECT TO_CHAR(transaction_date, 'YYYY-MM-DD') AS period,
             SUM(amount) AS total
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= NOW() - INTERVAL '1 day'
      GROUP BY TO_CHAR(transaction_date, 'YYYY-MM-DD')
      ORDER BY period DESC
    `;
  }

  // WEEKLY
  else if (period === 'weekly') {
    sql = `
      SELECT TO_CHAR(transaction_date, 'IYYY-IW') AS period,
             SUM(amount) AS total
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(transaction_date, 'IYYY-IW')
      ORDER BY period DESC
    `;
  }

  // MONTHLY
  else if (period === 'monthly') {
    sql = `
      SELECT TO_CHAR(transaction_date, 'YYYY-MM') AS period,
             SUM(amount) AS total
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= NOW() - INTERVAL '30 days'
      GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
      ORDER BY period DESC
    `;
  }

  // YEARLY
  else if (period === 'yearly') {
    sql = `
      SELECT TO_CHAR(transaction_date, 'YYYY') AS period,
             SUM(amount) AS total
      FROM transactions
      WHERE user_id = $1
        AND transaction_date >= NOW() - INTERVAL '1 year'
      GROUP BY TO_CHAR(transaction_date, 'YYYY')
      ORDER BY period DESC
    `;
  }

  pool.query(sql, [userId], callback);
};

// ============================
// Category Breakdown
// ============================
module.exports.selectCategoryBreakdown = (data, callback) => {
  const userId = data.userId;
  const period = data.period;

  let sql = `
    SELECT c.category_name,
           c.category_type,
           SUM(t.amount) AS total
    FROM transactions t
    JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = $1
  `;

  // DAILY
  if (period === 'daily') {
    sql += `
      AND t.transaction_date >= NOW() - INTERVAL '1 day'
    `;
  }

  // WEEKLY
  else if (period === 'weekly') {
    sql += `
      AND t.transaction_date >= NOW() - INTERVAL '7 days'
    `;
  }

  // MONTHLY
  else if (period === 'monthly') {
    sql += `
      AND t.transaction_date >= NOW() - INTERVAL '30 days'
    `;
  }

  // YEARLY
  else if (period === 'yearly') {
    sql += `
      AND t.transaction_date >= NOW() - INTERVAL '1 year'
    `;
  }

  sql += `
    GROUP BY c.category_name, c.category_type
    ORDER BY total DESC
  `;

  pool.query(sql, [userId], callback);
};

// ============================
// Dashboard Summary
// ============================
module.exports.selectDashboardSummary = (data, callback) => {
  const userId = data.userId;
  const period = data.period;

  let sql = `
    SELECT
      COALESCE(SUM(CASE 
        WHEN c.category_type = 'Expenses' THEN t.amount 
        ELSE 0 END), 0) AS total_spending,

      COALESCE(SUM(CASE 
        WHEN c.category_type = 'Income' THEN t.amount 
        ELSE 0 END), 0) AS total_income

    FROM transactions t
    JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = $1
  `;

  // DAILY
  if (period === 'daily') {
    sql += `
      AND t.transaction_date >= NOW() - INTERVAL '1 day'
    `;
  }

  // WEEKLY
  else if (period === 'weekly') {
    sql += `
      AND t.transaction_date >= NOW() - INTERVAL '7 days'
    `;
  }

  // MONTHLY
  else if (period === 'monthly') {
    sql += `
      AND t.transaction_date >= NOW() - INTERVAL '30 days'
    `;
  }

  // YEARLY
  else if (period === 'yearly') {
    sql += `
      AND t.transaction_date >= NOW() - INTERVAL '1 year'
    `;
  }

  pool.query(sql, [userId], callback);
};

// ============================
// CSV Export
// ============================
module.exports.selectExportTransactions = (data, callback) => {
  const sql = `
    SELECT t.transaction_date,
           c.category_name,
           t.amount,
           t.description
    FROM transactions t
    JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = $1
    ORDER BY t.transaction_date DESC
  `;

  pool.query(sql, [data.userId], callback);
};
