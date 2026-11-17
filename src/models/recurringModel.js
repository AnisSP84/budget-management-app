const pool = require('../services/db');

// INSERT recurring transaction
module.exports.insertRecurringTransaction = (data, callback) => {
  const SQL = `
        INSERT INTO recurring_transactions (
            user_id, category_id, amount, description, frequency, next_date, end_date, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *;
    `;

  const VALUES = [
    data.user_id,
    data.category_id,
    data.amount,
    data.description,
    data.frequency,
    data.next_date,
    data.end_date,
  ];

  pool.query(SQL, VALUES, callback);
};

// GET ALL recurring transactions with JOIN
module.exports.selectAllRecurringTransactions = (data, callback) => {
  const SQL = `
        SELECT 
            rt.recurring_id,
            rt.category_id,
            c.category_name,
            c.category_type,
            rt.amount,
            rt.description,
            rt.frequency,
            rt.next_date,
            rt.end_date,
            rt.is_active,
            rt.created_at
        FROM recurring_transactions rt
        INNER JOIN categories c 
          ON rt.category_id = c.category_id
        WHERE rt.user_id = $1
        ORDER BY rt.next_date ASC
  `;

  const VALUES = [data.user_id];

  pool.query(SQL, VALUES, callback);
};

//get recurring transaction by id
module.exports.selectRecurringTransactionById = (data, callback) => {
  const SQL = `
    SELECT *
    FROM recurring_transactions
    WHERE recurring_id = $1
    AND user_id = $2
  `;

  pool.query(SQL, [data.recurring_id, data.user_id], callback);
};

// UPDATE recurring transaction
module.exports.updateRecurringTransactionById = (data, callback) => {
  const SQL = `
        UPDATE recurring_transactions
        SET
            amount = $1,
            category_id = $2,
            description = $3,
            frequency = $4,
            next_date = $5,
            end_date = $6,
            is_active = $7
        WHERE recurring_id = $8
        AND user_id = $9
        RETURNING *;
    `;

  const VALUES = [
    data.amount,
    data.category_id,
    data.description,
    data.frequency,
    data.next_date,
    data.end_date,
    data.is_active,
    data.recurring_id,
    data.user_id,
  ];

  pool.query(SQL, VALUES, callback);
};

// DELETE recurring transaction
module.exports.deleteRecurringTransactionById = (data, callback) => {
  const SQL = `
        DELETE FROM recurring_transactions
        WHERE recurring_id = $1
        AND user_id = $2
        RETURNING *
    `;
  pool.query(SQL, [data.recurring_id, data.user_id], callback);
};

module.exports.getDueRecurring = (callback) => {
  const SQL = `
    SELECT 
      recurring_id,
      user_id,
      category_id,
      amount,
      description,
      frequency,
      next_date,
      end_date
    FROM recurring_transactions
    WHERE next_date <= CURRENT_DATE
    AND is_active = true;
  `;

  pool.query(SQL, callback);
};

module.exports.updateNextDate = (recurringId, nextDate, callback) => {
  const SQL = `
    UPDATE recurring_transactions
    SET next_date = $1
    WHERE recurring_id = $2
  `;

  pool.query(SQL, [nextDate, recurringId], callback);
};

module.exports.createFromRecurring = (recurring, callback) => {
  const SQL = `
    INSERT INTO transactions
    (
      user_id,
      category_id,
      amount,
      description,
      transaction_date
    )
    VALUES($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const VALUES = [
    recurring.user_id,
    recurring.category_id,
    recurring.amount,
    recurring.description,
    recurring.transaction_date,
  ];

  pool.query(SQL, VALUES, callback);
};
