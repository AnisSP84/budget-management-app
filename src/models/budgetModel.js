const pool = require('../services/db');

module.exports.insertBudget = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO budgets (user_id, category_id, amount, description)
    VALUES ($1, $2, $3, $4);
  `;
  const VALUES = [
    data.user_id,
    data.category_id || 1,
    data.amount,
    data.description || 'Main Monthly Budget',
  ];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.updateBudgetByUserId = (data, callback) => {
  const SQLSTATEMENT = `
    UPDATE budgets 
    SET amount = $1, description = $2 
    WHERE user_id = $3;
  `;
  const VALUES = [data.amount, data.description || 'Main Monthly Budget', data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

module.exports.upsertBudget = (data, callback) => {
  const checkSql = `SELECT budget_id FROM budgets WHERE user_id = $1;`;
  pool.query(checkSql, [data.user_id], (err, results) => {
    if (err) return callback(err);

    if (results && results.rows && results.rows.length > 0) {
      module.exports.updateBudgetByUserId(data, callback);
    } else {
      module.exports.insertBudget(data, callback);
    }
  });
};

module.exports.getBudgetByUserId = (userId, callback) => {
  const SQLSTATEMENT = `
    SELECT amount, description 
    FROM budgets 
    WHERE user_id = $1;
  `;
  pool.query(SQLSTATEMENT, [userId], callback);
};

module.exports.getCombinedBudgetData = (userId, callback) => {
  const SQLSTATEMENT = `
    SELECT 
      COALESCE((SELECT amount FROM budgets WHERE user_id = $1 LIMIT 1), 0.00) AS budget_limit,
      COALESCE((
        SELECT SUM(t.amount) 
        FROM transactions t
        INNER JOIN categories c ON t.category_id = c.category_id
        WHERE t.user_id = $1 
          AND c.category_type = 'Expenses'
          AND EXTRACT(MONTH FROM t.transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM t.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ), 0.00) AS total_spent;
  `;
  pool.query(SQLSTATEMENT, [userId], callback);
};

module.exports.getCategoryBreakdown = (userId, callback) => {
  const SQLSTATEMENT = `
    SELECT 
      c.category_name,
      COALESCE(SUM(t.amount), 0) AS total_amount
    FROM transactions t
    INNER JOIN categories c ON t.category_id = c.category_id
    WHERE t.user_id = $1 
      AND c.category_type = 'Expenses'
      AND EXTRACT(MONTH FROM t.transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM t.transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY c.category_name
    ORDER BY total_amount DESC;
  `;
  pool.query(SQLSTATEMENT, [userId], callback);
};

module.exports.createBudgetNotification = (data, callback) => {
  const SQLSTATEMENT = `
    INSERT INTO notifications (user_id, message, type, title)
    VALUES ($1, $2, $3, $4);
  `;
  const VALUES = [data.user_id, data.message, data.type, data.title];
  pool.query(SQLSTATEMENT, VALUES, callback);
};
