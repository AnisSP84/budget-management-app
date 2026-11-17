const model = require('../models/transactionsModel');

// Create Transaction
module.exports.createTransaction = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ error: 'User ID missing from token. Please re-login.' });
  }

  const data = {
    user_id: res.locals.userId,
    category_id: req.body.category_id,
    description: req.body.description,
    amount: req.body.amount,
    transaction_date: req.body.transaction_date,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error createTransaction:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.status(201).json(results.rows[0]);
    }
  };

  model.insertSingle(data, callback);
};

// Get All Transactions
module.exports.getAllTransactions = (req, res, next) => {
  const userId = res.locals.userId;
  const callback = (error, results, fields) => {
    if (error) {
      console.error('Error getAllTransactions:', error);
      res.status(500).json({ message: 'Internal server error.' });
    } else {
      res.status(200).json(results.rows);
    }
  };

  model.selectAllByUserId(userId, callback);
};

// Update Transaction
module.exports.updateTransaction = (req, res, next) => {
  if (!req.body.description || !req.body.amount || !req.body.category_id) {
    return res.status(400).json({ message: 'Missing required data.' });
  }

  const data = {
    id: req.params.id,
    user_id: res.locals.userId,
    description: req.body.description,
    amount: req.body.amount,
    category_id: req.body.category_id,
    transaction_date: req.body.transaction_date || new Date().toISOString(),
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error updateTransaction:', error);
      res.status(500).json({ message: 'Internal server error.' });
    } else {
      if (results.rowCount === 0) {
        res.status(404).json({ message: 'Transaction not found.' });
      } else {
        res.status(204).send();
      }
    }
  };

  model.updateById(data, callback);
};

// Delete Transaction
module.exports.deleteTransaction = (req, res, next) => {
  const data = {
    id: req.params.id,
    user_id: res.locals.userId,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error deleteTransaction:', error);
      res.status(500).json({ message: 'Internal server error.' });
    } else {
      if (results.rowCount === 0) {
        res.status(404).json({ message: 'Transaction not found.' });
      } else {
        res.status(204).send();
      }
    }
  };

  model.deleteById(data, callback);
};

// Bulk Delete Transactions
module.exports.deleteBulk = (req, res, next) => {
  const ids = req.body.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'An array of transaction IDs is required.' });
  }

  const data = {
    ids: ids,
    user_id: res.locals.userId,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error deleteBulk:', error);
      res.status(500).json({ message: 'Internal server error.' });
    } else {
      res.status(200).json({
        message: 'Transactions deleted successfully.',
        deletedCount: results.rowCount,
      });
    }
  };

  model.deleteBulkByIds(data, callback);
};

// Get User Budget
module.exports.getUserBudget = (req, res, next) => {
  const userId = res.locals.userId;

  const callback = (error, results) => {
    if (error) {
      console.error('Error getUserBudget:', error);
      res.status(500).json({ message: 'Internal server error.' });
    } else {
      const budget = results.rows[0] ? results.rows[0].amount : 0;
      res.status(200).json({ budget_limit: budget });
    }
  };
  model.getBudgetByUserId(userId, callback);
};

// Update or Create User Budget
module.exports.updateBudget = (req, res, next) => {
  if (req.body.amount === undefined) {
    return res.status(400).json({ message: 'Amount is required.' });
  }

  const data = {
    user_id: res.locals.userId,
    amount: req.body.amount,
    category_id: 1,
    description: 'Main Monthly Budget',
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error updateBudget:', error);
      res.status(500).json({ message: 'Internal server error.' });
    } else {
      res.status(200).json({ message: 'Budget updated successfully.' });
    }
  };

  model.upsertBudget(data, callback);
};
