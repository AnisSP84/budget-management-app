const model = require('../models/recurringModel');

// CREATE RECURRING TRANSACTION
module.exports.createRecurringTransaction = (req, res, next) => {
  const data = {
    user_id: res.locals.userId,
    category_id: req.body.category_id,
    amount: req.body.amount,
    description: req.body.description || null,
    frequency: req.body.frequency,
    next_date: req.body.next_date,
    end_date: req.body.end_date || null,
  };

  //validation
  if (!data.category_id || !data.amount || !data.frequency || !data.next_date) {
    return res.status(400).json({
      message: 'Missing requires fields',
    });
  }

  const validFrequency = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

  if (!validFrequency.includes(data.frequency)) {
    return res.status(400).json({
      message: 'Frequency must be Daily, Weekly, Monthly or Yearly',
    });
  }

  model.insertRecurringTransaction(data, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json(error);
    }

    res.status(201).json({
      message: 'Recurring transaction created successfully',
      recurringTransaction: results.rows[0],
    });
  });
};

// GET ALL RECURRING TRANSACTIONS
module.exports.getRecurringTransactions = (req, res, next) => {
  const data = { user_id: res.locals.userId };

  model.selectAllRecurringTransactions(data, (error, results) => {
    if (error) {
      console.error('GET ERROR:', error);
      return res.status(500).json({
        message: 'Database error while fetching recurring transactions',
        error: error.message,
      });
    }

    // Return consistent format with rows property
    res.status(200).json({
      rows: results.rows,
      count: results.rows.length,
    });
  });
};

//get recurring transaction by id
module.exports.getRecurringTransactionById = (req, res) => {
  const data = {
    recurring_id: req.params.id,
    user_id: res.locals.userId,
  };

  model.selectRecurringTransactionById(data, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Internal server error',
      });
    }

    if (results.rows.length === 0) {
      return res.status(404).json({
        message: 'Recurring transaction not found',
      });
    }

    res.status(200).json(results.rows[0]);
  });
};

// UPDATE RECURRING TRANSACTION
module.exports.updateRecurringTransaction = (req, res, next) => {
  const data = {
    recurring_id: req.params.id,
    user_id: res.locals.userId,
    category_id: req.body.category_id,
    amount: req.body.amount,
    description: req.body.description,
    frequency: req.body.frequency,
    next_date: req.body.next_date,
    end_date: req.body.end_date || null,
    is_active: req.body.is_active,
  };

  //validation
  const requiredFields = ['category_id', 'amount', 'frequency', 'next_date'];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      return res.status(400).json({
        message: `Missing required field: ${field}`,
      });
    }
  }

  const validFrequencies = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

  if (!validFrequencies.includes(data.frequency)) {
    return res.status(400).json({
      message: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`,
    });
  }

  model.updateRecurringTransactionById(data, (error, results) => {
    if (error) {
      console.error('Update Error:', error);
      return res.status(500).json({
        message: 'Database error while updating recurring transaction',
        error: error.message,
      });
    }

    if (results.rows.length === 0) {
      return res.status(404).json({
        message: 'Recurring transaction not found',
      });
    }

    res.status(200).json({
      message: 'Recurring transaction updated successfully',
      recurringTransaction: results.rows[0],
    });
  });
};

// DELETE RECURRING TRANSACTION
module.exports.deleteRecurringTransaction = (req, res, next) => {
  const data = {
    recurring_id: req.params.id,
    user_id: res.locals.userId,
  };

  model.deleteRecurringTransactionById(data, (error, results) => {
    if (error) {
      console.error('DELETE ERROR:', error);
      return res.status(500).json({
        message: 'Database error while deleting recurring transaction',
        error: error.message,
      });
    }

    if (!results.rows || results.rows.length === 0) {
      return res.status(404).json({ message: 'Recurring transaction not found' });
    }

    res.status(200).json({
      message: 'Recurring transaction deleted successfully',
      deletedTransaction: results.rows[0],
    });
  });
};

// PROCESS DUE RECURRING TRANSACTIONS
module.exports.processRecurringTransactions = (req, res) => {
  model.getDueRecurring(function (error, results) {
    if (error) {
      console.error(error);
      return res.status(500).json(error);
    }

    const rows = results.rows;
    if (rows.length === 0) {
      return res.status(200).json({
        message: 'Nothing to process',
      });
    }

    processOne(0);

    function processOne(index) {
      if (index >= rows.length) {
        return res.status(200).json({
          message: 'Recurring transactions processed successfully',
          processed: rows.length,
        });
      }

      const recurring = rows[index];

      const today = new Date();
      let currentDate = new Date(recurring.next_date);

      processRecurringDates();

      function processRecurringDates() {
        const end = recurring.end_date ? new Date(recurring.end_date) : null;

        //Stop if next date is after today
        if (currentDate > today) {
          return model.updateNextDate(
            recurring.recurring_id,
            formatDate(currentDate),
            function (error) {
              if (error) {
                console.error(error);
                return res.status(500).json(error);
              }

              processOne(index + 1);
            },
          );
        }

        if (end && currentDate > end) {
          return model.deleteRecurringTransactionById(
            {
              recurring_id: recurring.recurring_id,
              user_id: recurring.user_id,
            },
            function (error) {
              if (error) {
                console.error(error);
                return res.status(500).json(error);
              }

              processOne(index + 1);
            },
          );
        }

        model.createFromRecurring(
          {
            user_id: recurring.user_id,
            category_id: recurring.category_id,
            amount: recurring.amount,
            description: recurring.description,
            transaction_date: formatDate(currentDate),
          },
          function (error) {
            if (error) {
              console.error(error);
              return res.status(500).json(error);
            }

            currentDate = new Date(getNextDate(formatDate(currentDate), recurring.frequency));

            processRecurringDates();
          },
        );
      }
    }
  });
};

function getNextDate(date, frequency) {
  const next = new Date(date);

  switch (frequency.toLowerCase()) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;

    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;

    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next.toISOString().split('T')[0];
}

function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}
