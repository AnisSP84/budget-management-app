const pool = require('../services/db');
module.exports.pool = pool;

// Insert One Transaction
module.exports.insertSingle = (data, callback) => {
  const SQLSTATMENT = `
        INSERT INTO transactions (user_id, category_id, description, amount, transaction_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
  const VALUES = [
    data.user_id,
    data.category_id,
    data.description,
    data.amount,
    data.transaction_date,
  ];
  pool.query(SQLSTATMENT, VALUES, callback);
};

// Select all Transactions
module.exports.selectAllByUserId = (userId, callback) => {
  const SQLSTATMENT = `
        SELECT 
            t.transaction_id, 
            t.amount, 
            t.description, 
            t.transaction_date, 
            t.category_id,
            c.category_name
        FROM transactions t
        JOIN categories c ON t.category_id = c.category_id
        WHERE t.user_id = $1
        ORDER BY t.transaction_id DESC;
    `;

  pool.query(SQLSTATMENT, [userId], callback);
};

// Update Transaction by ID
module.exports.updateById = (data, callback) => {
  const SQLSTATMENT = `
        UPDATE transactions
        SET category_id = $1, amount = $2, description = $3, transaction_date = $4
        WHERE transaction_id = $5 AND user_id = $6;
    `;
  const VALUES = [
    data.category_id,
    data.amount,
    data.description,
    data.transaction_date,
    data.id,
    data.user_id,
  ];

  pool.query(SQLSTATMENT, VALUES, callback);
};

// Delete Transaction by ID
module.exports.deleteById = (data, callback) => {
  const SQLSTATMENT = `
        DELETE FROM transactions 
        WHERE transaction_id = $1 AND user_id = $2;
    `;
  const VALUES = [data.id, data.user_id];
  pool.query(SQLSTATMENT, VALUES, callback);
};

// Delete Multiple Transactions in Bulk
module.exports.deleteBulkByIds = (data, callback) => {
  const SQLSTATEMENT = `
    DELETE FROM transactions 
    WHERE transaction_id = ANY($1::int[]) AND user_id = $2;
  `;
  const VALUES = [data.ids, data.user_id];
  pool.query(SQLSTATEMENT, VALUES, callback);
};

// Get a user budget
module.exports.getBudgetByUserId = (userId, callback) => {
  const SQLSTATMENT = `
        SELECT amount FROM budgets 
        WHERE user_id = $1 
        ORDER BY created_at DESC LIMIT 1;
    `;
  pool.query(SQLSTATMENT, [userId], callback);
};

// Insert or Update Budget
module.exports.upsertBudget = (data, callback) => {
  const SQLSTATMENT = `
        INSERT INTO budgets (user_id, category_id, amount, description)
        VALUES ($1, $2, $3, $4);
    `;
  const VALUES = [
    data.user_id,
    data.category_id || 1,
    data.amount,
    data.description || 'Monthly Budget',
  ];
  pool.query(SQLSTATMENT, VALUES, callback);
};
