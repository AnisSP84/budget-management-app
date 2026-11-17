const model = require('../models/goalsModel');

module.exports.createGoal = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  const { title, target_amount, target_date } = req.body;

  if (!title || !target_amount || !target_date) {
    return res
      .status(400)
      .json({ message: 'Missing required fields: title, target_amount, target_date.' });
  }

  const data = {
    user_id: res.locals.userId,
    title,
    target_amount: parseFloat(target_amount),
    current_amount: parseFloat(req.body.current_amount || 0),
    target_date,
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error createGoal:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
    res.status(201).json({ message: 'Goal created successfully.', goal: results.rows[0] });
  };

  model.createGoal(data, callback);
};

module.exports.getGoals = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  const userId = res.locals.userId;

  const callback = (error, results) => {
    if (error) {
      console.error('Error getGoals:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
    res.status(200).json(results.rows);
  };

  model.getGoalsByUserId(userId, callback);
};

module.exports.depositToGoal = (req, res, next) => {
  if (!res.locals.userId) {
    return res.status(401).json({ message: 'Unauthorized access. Missing session token.' });
  }

  const { goal_id, amount } = req.body;

  if (!goal_id || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: 'Valid goal_id and positive deposit amount required.' });
  }

  const data = {
    user_id: res.locals.userId,
    goal_id,
    amount_to_add: parseFloat(amount),
  };

  const callback = (error, results) => {
    if (error) {
      console.error('Error depositToGoal:', error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
    if (results.rows.length === 0) {
      return res.status(404).json({ message: 'Goal not found or access denied.' });
    }
    res.status(200).json({ message: 'Deposit successful.', goal: results.rows[0] });
  };

  model.updateGoalProgress(data, callback);
};
