const model = require('../models/userModel.js');

// function to read User By local userId
module.exports.readUserById = (req, res, next) => {
  if (!res.locals.userId) {
    console.error('userId missing');
    return res.status(404).json({ message: 'Not logged in' });
  }

  const data = {
    userId: res.locals.userId,
  };

  const callback = (error, results, fields) => {
    if (error) {
      console.error('Error readtUserById:', error);
      return res.status(500).json(error);
    }

    if (results.rows.length == 0) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.locals.result = { token: res.locals.token, ...results.rows[0] };
    next();
  };

  model.readUserById(data, callback);
};

module.exports.returnUserDetails = (req, res, next) => {
  const data = {
    userId: res.locals.userId,
  };

  const callback = (error, results, fields) => {
    if (error) {
      console.error('Error returnUserDetails:', error);
      return res.status(500).json(error);
    }

    if (results.rows.length == 0) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.status(200).json(res.locals.result);
  };

  model.readUserById(data, callback);
};
