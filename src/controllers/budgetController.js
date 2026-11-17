const model = require('../models/budgetModel');

module.exports.updateBudget = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  if (req.body.amount === undefined) {
    return res.status(400).json({ message: 'Amount is required.' });
  }

  const userId = res.locals.userId;
  const data = {
    user_id: userId,
    amount: req.body.amount,
    category_id: 1,
    description: 'Main Monthly Budget',
  };

  model.getBudgetByUserId(userId, (checkErr, checkResults) => {
    if (checkErr) {
      console.error('Error updateBudget check:', checkErr);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    const callback = (error, results) => {
      if (error) {
        console.error('Error updateBudget:', error);
        res.status(500).json({ message: 'Internal server error.' });
      } else {
        res.status(200).json({ message: 'Budget updated successfully.' });
      }
    };

    if (checkResults.rows && checkResults.rows.length > 0) {
      model.updateBudgetByUserId(data, callback);
    } else {
      model.insertBudget(data, callback);
    }
  });
};

module.exports.getBudget = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  const userId = res.locals.userId;

  const callback = (error, results) => {
    if (error) {
      console.error('Error getBudget:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (!results || !results.rows || results.rows.length === 0) {
      return res.status(200).json({ amount: 0.0, description: 'No Budget Set' });
    }

    res.status(200).json(results.rows[0]);
  };

  model.getBudgetByUserId(userId, callback);
};

module.exports.getCombinedBudgetData = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  const userId = res.locals.userId;

  const callback = (error, results) => {
    if (error) {
      console.error('Error getCombinedBudgetData:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (!results || !results.rows || results.rows.length === 0) {
      return res.status(200).json({
        budget_limit: 0.0,
        total_spent: 0.0,
        amount: 0.0,
      });
    }

    res.status(200).json(results.rows[0]);
  };

  model.getCombinedBudgetData(userId, callback);
};

module.exports.getCategoryAnalytics = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  const userId = res.locals.userId;

  const callback = (error, results) => {
    if (error) {
      console.error('Error getCategoryAnalytics:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    const categories = results && results.rows ? results.rows : [];
    res.status(200).json(categories);
  };

  model.getCategoryBreakdown(userId, callback);
};

module.exports.createAlertNotification = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  if (!req.body.message || !req.body.type || !req.body.title) {
    return res.status(400).json({ message: 'Missing required notification fields.' });
  }

  const data = {
    user_id: res.locals.userId,
    message: req.body.message,
    type: req.body.type,
    title: req.body.title,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error createAlertNotification:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }

    res.status(201).json({ message: 'Budget breach notification logged successfully.' });
  };

  model.createBudgetNotification(data, callback);
};
